import serial
import json
import os
from dotenv import load_dotenv
from time import sleep
from enum import Enum
import threading

load_dotenv()

class PumpState(Enum):
    Off = "off"
    On = "on"

class Hardware:
    __ser = serial.Serial(
        os.getenv("SERIAL_PORT"),
        int(os.getenv("SERIAL_BAUDRATE")),
        timeout=1
    )

    def __init__(self) -> None:
        self.pump_state = PumpState.Off
        self.__pumpOpeningThreshold = float(os.getenv("PUMP_OPENING_THRESHOLD", 10))
        self.__maxIrrigationValue = float(os.getenv("IRRIGATION_MAX_OPENING_S", 10))
        self.irrigation_thread = None

    def irrigate(self, seconds):
        if(self.irrigation_thread != None):
            while self.irrigation_thread.is_alive() == True:
                sleep(0.5)

        self.irrigation_thread = threading.Thread(target=self.__open_pump_for, args=(seconds,)).start()

    def __open_pump_for(self, seconds):
        if seconds >  self.__pumpOpeningThreshold:
            self.open_pump()
            sleep(seconds)
        if seconds < self.__maxIrrigationValue - self.__pumpOpeningThreshold:
            self.close_pump()

    def open_pump(self):
        self.pump_state = PumpState.On
        self.__ser.write(b"1")

    def close_pump(self):
        self.pump_state = PumpState.Off
        self.__ser.write(b"0")

    def get_pump_state(self):
        return self.pump_state

    def read_sensor_data(self):
        buffer = ''
        while True:
            try:
                bytes_to_read = self.__ser.inWaiting()
                if bytes_to_read > 0:
                    read = self.__ser.read()
                    read_string = read.decode('utf-8')
                    buffer += read_string

                if '\n' in buffer:
                    lines = buffer.split('\n')
                    last_received = lines[-2]
                    buffer = lines[-1]
                    data = json.loads(last_received.strip())
                    return data
            except Exception as e:
                pass
