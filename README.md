# CS3219 Project (PeerPrep) - AY2526S2
## Group: G16

PeerPrep is a collaborative peer interview preparation platform built using a microservices architecture. It allows users to register for an account and log in, get matched with a peer, attempt coding questions and collaborate in real time. The system includes User, Question, Matching and Collaboration Services.

---

## Table of Contents

- Architecture Overview
- Prerequisites
- Getting Started
  - 1. Clone the Repository
  - 2. Set Up Environment Variables
  - 3. Run with Docker
- Services & Ports
- Environment Variables Reference
- Stopping the App
- Troubleshooting

---

## Architecture Overview

PeerPrep is a microservices application. Each service runs in its own Docker container:

| Service | Description | Tech |
|---|---|---|
| Frontend | User interface | React + Vite |
| User Service | Authentication, accounts, JWT | Express.js |
| Question Service | Question bank & admin management | TypeScript |
| Collaboration Service | Real-time coding sessions | TypeScript |
| Matching Service | Pairs users by topic and difficulty | TypeScript |
| Code Executor | Runs and evaluates submitted code | gVisor |
| MongoDB | Primary database | MongoDB 7 |
| Redis | Caching, queues, Redis Streams | Redis 7 |

---

## Prerequisites

Make sure you have the following installed before proceeding:

- Docker Desktop (https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git (https://git-scm.com/)

To verify your installation, run:

docker --version
docker compose version
git --version

---

## Getting Started

### 1. Clone the Repository

git clone https://github.com/CS3219-AY2526S2/peerprep-g16.git 

---

### 2. Set Up Environment Variables

The app uses a .env file to store secrets and configuration. This file is not included in the repository for security reasons — you need to create it yourself.

In the root of the project, create a file named .env:

touch .env   # Mac/Linux
# On Windows, create the file manually in File Explorer or with Notepad

Then open .env in any text editor and paste in the following, filling in your own values:

# ── MongoDB ────────────────────────────────────────────
MONGO_USERNAME=your_mongo_username
MONGO_PASSWORD=your_mongo_password

# ── MongoDB URIs ───────────────────────────────────────
# Local URI is constructed automatically from the credentials above.
# Set the cloud URI if you want to use MongoDB Atlas instead:
DB_CLOUD_URI=

# URIs for individual services (can point to the same DB or separate ones)
QUESTION_SERVICE_MONGODB_URI=mongodb://your_mongo_username:your_mongo_password@localhost:27017/peerprepQuestionServiceDB?authSource=admin
COLLAB_MONGODB_URI=mongodb://your_mongo_username:your_mongo_password@localhost:27017/peerprepCollabServiceDB?authSource=admin

# ── Auth / JWT ─────────────────────────────────────────
JWT_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_another_long_random_string

# ── Encryption ─────────────────────────────────────────
# Must be exactly 32 characters for AES-256
ENCRYPTION_KEY=replace_with_32_character_string!!
# Must be exactly 16 characters
ENCRYPTION_IV=replace16chariv!!

# ── (Optional) Public IP for remote deployments ────────
# Uncomment and set this if you are deploying to a server.
# PUBLIC_IP=http://<your-server-ip>

Tips for generating secure secrets:

# Generate a random 32-character string (Mac/Linux)
openssl rand -hex 32

You can run this command multiple times to generate different values for JWT_SECRET, JWT_REFRESH_SECRET, and ENCRYPTION_KEY.

---

### 3. Run with Docker

From the project root directory, run:

docker compose up --build

- --build compiles the Docker images from source. You only need this flag the first time, or after pulling new code changes.
- For subsequent runs you can use `docker compose up` (without `--build`) to start faster.

Docker will start all services in the correct order. Once everything is running, open your browser and go to:

http://localhost:5173

---

## Services & Ports

Once running, the individual services are accessible at:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| User Service API | http://localhost:3001 |
| Question Service API | http://localhost:3002 |
| Collaboration Service API | http://localhost:3003 |
| Matching Service API | http://localhost:3004 |
| Code Executor | http://localhost:2358 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |

> Direct access to MongoDB and Redis is useful for debugging. Normal users only need the Frontend URL.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| MONGO_USERNAME | ✅ | MongoDB root username |
| MONGO_PASSWORD | ✅ | MongoDB root password |
| DB_CLOUD_URI | ❌ | MongoDB Atlas URI (overrides local DB) |
| QUESTION_SERVICE_MONGODB_URI | ✅ | Full MongoDB URI for the Question Service |
| COLLAB_MONGODB_URI | ✅ | Full MongoDB URI for the Collaboration Service |
| JWT_SECRET | ✅ | Secret for signing access tokens |
| JWT_REFRESH_SECRET | ✅ | Secret for signing refresh tokens |
| ENCRYPTION_KEY | ✅ | 32-character AES-256 encryption key |
| ENCRYPTION_IV | ✅ | 16-character AES initialisation vector |
| PUBLIC_IP | ❌ | Server IP for remote/production deployments |

---

## Stopping the App

To stop all running containers:

docker compose down

To stop and delete all stored data (MongoDB and Redis volumes):

docker compose down -v

> ⚠️ The -v flag permanently deletes your local database. Only use it if you want a completely clean slate.

---

## Troubleshooting

Containers keep restarting or won't start
- Run docker compose logs <service-name> to see what went wrong. For example: docker compose logs user-service.

Port already in use
- Another application on your machine is using one of the required ports (5173, 3001–3004, 2358, 27017, 6379). Stop that application or change the port mapping in compose.yml.

Changes to code are not reflected
- Rebuild the images: docker compose up --build

MongoDB authentication errors
- Double-check that the credentials in your .env match the URI strings in QUESTION_SERVICE_MONGODB_URI and COLLAB_MONGODB_URI.
