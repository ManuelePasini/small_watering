# Smart Irrigation Prototype

This repository contains a smart irrigation small scale prototype implemented through [Flask](https://flask.palletsprojects.com/en/3.0.x/), result of the bachelor thesis by Davide Speziali.

# Deployment

The application requires Python to be run and the required dependencies fir the application backend can be found in ``small_watering/dashboard/requirements.txt``

An example of the .env storing configurations variables can be found in ``small_watering/dashboard/.env.example`` which for a standard deploy can simply be renamed .env

The application backend can be run via :

    small_watering/dashboard/main.py

The web application is then reachable at ``http://{HOST}:{PORT}``

