import requests
import time
import os
from time import sleep
from datetime import datetime
from dotenv import load_dotenv

from remote_manager.remote_manager import RemoteManager
from repository.sensor_repository import SensorRepository
from repository.irrigation_repository import IrrigationRepository
from model.irrigation import IrrigationManager
from model.sensors import SensorManager
from hardware.hardware import Hardware
from interpolator.interpolator import interpolate_data

class Controller:

    def __init__(self):
        self.__sensor_history = []
        self.__irrigation_history = []
        self.__stop_uploading = True
        hardware = Hardware()
        self.__irrigation_manager = IrrigationManager(hardware)
        self.__sensor_manager = SensorManager(hardware)
        self.__irrigationDataToKeep = int(os.getenv("NUMBER_OF_IRRIGATION_DATA_TO_KEEP_IN_MEMORY", 10))
        self.__irrigationCheckPeriod = float(os.getenv("IRRIGATION_CHECK_PERIOD", 0.5))
        self.__irrigationComputePeriod = float(os.getenv("IRRIGATION_COMPUTE_PERIOD", 15))

    def empty_sensor_data(self):
        self.__sensor_history = self.__sensor_history[-1:]

    def empty_irrigation_data(self):
        self.__irrigation_history = self.__irrigation_history[-self.__irrigationDataToKeep:]

    def get_all_sensor_data(self, seconds=None):
        if seconds is not None:
            end_time = time.time()
            start_time = end_time - seconds
            result = [row for row in self.__sensor_history if start_time <= float(row["timestamp"]) <= end_time]
        else:
            result = self.__sensor_history
        self.empty_sensor_data()
        return result

    def get_last_sensor_data(self):
        return self.__sensor_history[-1] if self.__sensor_history else []

    def get_last_sensor_data_with_interpolation(self):
        sensor_data = self.get_last_sensor_data()
        if len(sensor_data) == 0:
            return []
        else:
            return {
                        'data': interpolate_data(sensor_data['data'], [10, 30], [5, 15, 25]),
                        'timestamp': sensor_data['timestamp']
                    }

    def get_all_irrigation_data(self, seconds=None):
        irrigation_data = self.__irrigation_history
        if len(irrigation_data) == 0:
            return [self.__get_empty_irrigation_data()]

        if seconds is not None:
            end_time = time.time()
            start_time = end_time - seconds
            result = [row for row in irrigation_data if start_time <= float(row["timestamp"]) <= end_time]
        else:
            result = irrigation_data
        self.empty_irrigation_data()
        return result

    def get_last_irrigation_data(self):
        if (self.__irrigation_history):
            return self.__irrigation_history[-1]
        else:
            last_sensor_data = self.get_last_sensor_data()
            last_irrigation_data = {}
            return self.__irrigation_manager.compute_irrigation(last_sensor_data=last_sensor_data, last_irrigation_data=last_irrigation_data)

    def __get_empty_irrigation_data(self):
        return {"timestamp": datetime.now().timestamp(), "r": 0, "irrigation": 0, "optimal_m": 0, "current_m": 0}

    def get_pump_state(self):
        return self.__irrigation_manager.get_pump_state()

    def set_irrigation_mode(self, mode):
        self.__irrigation_manager.set_irrigation_mode(mode)

    def set_new_optimal_value(self, value):
        self.__irrigation_manager.set_new_optimal_value(value)

    def set_new_optimal_matrix(self, matrix):
        self.__irrigation_manager.set_new_optimal_matrix(matrix)

    def toggle_pump(self):
        self.__irrigation_manager.toggle_pump()

    def get_optimal_matrix_average(self):
        optimal = self.__irrigation_manager.get_optimal_matrix()
        if not optimal:
            return None
        total = sum(sensor["v"] for sensor in optimal['value'])
        average = total / len(optimal['value'])
        return average

    def compute_irrigation_thread(self):
        frequency = self.__irrigationCheckPeriod

        while True:
            last_sensor_data = self.get_last_sensor_data()
            last_irrigation_data = self.get_last_irrigation_data()
            if(len(last_sensor_data) == 0):
                sleep(1)
                continue
            irrigation = self.__irrigation_manager.compute_irrigation(last_sensor_data=last_sensor_data, last_irrigation_data=last_irrigation_data, frequency=frequency, computation_frequency=self.__irrigationComputePeriod)
            self.__irrigation_history.append(irrigation)
            frequency = self.__irrigationCheckPeriod if frequency % (self.__irrigationComputePeriod) == 0 else (frequency + self.__irrigationCheckPeriod)

            sleep(self.__irrigationCheckPeriod)

    def receive_sensor_data_thread(self):
        while True:
            sensor_data = self.__sensor_manager.receive_sensor_data()
            self.__sensor_history.append(sensor_data)

    def upload_data_thread(self):
        remote_manager = RemoteManager()
        while True:
            sleep(60)
            sensor_data = self.get_all_sensor_data()
            irrigation_data = self.get_all_irrigation_data()
            if self.__stop_uploading == False:
                remote_manager.upload_data(sensor_data, irrigation_data)

    def stop_upload(self):
        self.__stop_uploading = True

    def start_upload(self):
        self.__stop_uploading = False

    def is_upload_on(self):
        return self.__stop_uploading == False

    def get_optimals(self):
        return self.__irrigation_manager.get_optimals()