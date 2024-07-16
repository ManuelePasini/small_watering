#define TIMER_INTERRUPT_DEBUG 0
#define _TIMERINTERRUPT_LOGLEVEL_ 0
#define USE_TIMER_1 true
#include <TimerInterrupt.h>
#include <ArduinoJson.h>

const int Sensors[3][2] = {{A0, A1}, {A2, A3}, {A4, A5}};
const int PumpPin = 2;

int minADC = 0;
int maxADC = 600;
int values[3][2];
bool retrieveSensorsDataAndSend = false;

void TimerHandler(void)
{
	retrieveSensorsDataAndSend = true;
}

#define TIMER_INTERVAL_MS 500

void setup()
{
	Serial.begin(9600);
	while (!Serial);
	for (int i = 0; i < 3; i++)
	{
		for (int j = 0; j < 2; j++)
		{
			pinMode(Sensors[i][j], INPUT);
		}
	}
	pinMode(PumpPin, OUTPUT);
	ITimer1.init();
	ITimer1.attachInterruptInterval(TIMER_INTERVAL_MS, TimerHandler);
}

void loop()
{
	if (retrieveSensorsDataAndSend)
	{
		StaticJsonDocument<512> doc;
		JsonArray data = doc.createNestedArray("data");

		for (int i = 0; i < 3; i++)
		{
			for (int j = 0; j < 2; j++)
			{
				int sensorValue = analogRead(Sensors[i][j]);
				int mappedValue = map(sensorValue, minADC, maxADC, 0, 100);

				JsonObject sensorData = data.createNestedObject();
				sensorData["y"] = 5 + 5 * (i) * 2;
				sensorData["x"] = 10 + 10 * (j) * 2;
				sensorData["v"] = mappedValue;
			}
		}
		String output;
		serializeJson(doc, output);
		Serial.println(output);
		retrieveSensorsDataAndSend = false;
	}

	if (Serial.available() > 0)
	{
		int pumpState = Serial.read();
		if (pumpState == '1')
		{
			digitalWrite(PumpPin, HIGH);
		}
		else
		{
			digitalWrite(PumpPin, LOW);
		}
	}
}
