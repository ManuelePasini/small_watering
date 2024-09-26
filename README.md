# Smart Irrigation Prototype

This repository contains a smart irrigation small scale prototype implemented through [Flask](https://flask.palletsprojects.com/en/3.0.x/), result of the bachelor thesis by Davide Speziali.

# Deployment

The application requires Python to be run and the required dependencies for the application backend can be found in ``small_watering/dashboard/requirements.txt``

The application requires some configuration varbiales to be stored in a .env. An example of the .env file can be found in ``small_watering/dashboard/.env.example``; for a standard deploy, it can simply be renamed .env

The application backend can be run via:

    python3 small_watering/dashboard/main.py

The web application is then reachable at ``http://{HOST}:{PORT}``.

