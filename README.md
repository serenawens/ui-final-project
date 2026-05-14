# Spring 2026 UI Group Final Project

## Team Members

- Serena Wen - @serenawens
- Matthew Labasan - @MatthewLabasan
- Melisa Zhang - @melzhang04
- Carlos Sanchez - @csanchez00

## Project Description

This repository contains the final project for our Spring 2026 User Interfaces group. We developed an application that teaches you how to care for different fabrics, with a quiz at the end to test your knowledge.

## How to Run This Project

### Prerequisites

- [Python 3.x](https://www.python.org/downloads/)

### 1. Clone the Repository

```sh
git clone https://github.com/serenawens/ui-final-project.git
cd ui-final-project
```

### 2. Run the Application

- Create and activate virtual environment
  ```
  python3 -m venv venv
  source venv/bin/activate
  ```
- Set Flask app entry point
  ```
  export FLASK_APP=server.py
  ```
- Run Flask app
  ```
  flask run
  ```

## Project Structure

```
/ (project root)
|- index.html
|- app.py (optional Python backend)
|- static/ (css/js files)
|- README.md
|- package.json / requirements.txt (optional)
```
