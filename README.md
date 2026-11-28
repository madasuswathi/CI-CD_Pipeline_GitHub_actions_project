
# FarmFresh | E-Commerce Application & End-to-End DevOps Implementation

<p align="center">

**A Full-Stack E-Commerce Application with Automated CI/CD, Containerization and AWS Cloud Deployment**

</p>

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Objectives](#2-project-objectives)
3. [Technology Stack](#3-technology-stack)
4. [Application Features](#4-application-features)
5. [System Architecture](#5-system-architecture)
6. [CI/CD Pipeline Implementation](#6-cicd-pipeline-implementation)
7. [Containerization and Docker Hub](#7-containerization-and-docker-hub)
8. [AWS Cloud Deployment](#8-aws-cloud-deployment)
9. [Security Implementation](#9-security-implementation)
10. [SonarCloud Code Quality](#10-sonarcloud-code-quality)
11. [Project Links](#11-project-links)
12. [Validation and Testing](#12-validation-and-testing)
13. [Project Outcomes](#13-project-outcomes)
14. [Future Enhancements](#14-future-enhancements)



## 1. Project Overview

**FarmFresh** is a full-stack e-commerce application developed to provide an online platform for purchasing fresh and traditional food products.

This project demonstrates the implementation of an end-to-end DevOps workflow by integrating application development, source code management, continuous integration, code quality analysis, Docker containerization, image publishing, automated deployment and cloud hosting.

The application is deployed on an AWS EC2 Ubuntu server. Docker Compose manages the application and MySQL database containers, while Nginx acts as a reverse proxy for incoming HTTP requests.

The CI/CD pipeline automates application validation, Docker image creation, publishing and deployment.

**Project Type:** Full-Stack Development and DevOps Automation
**Application Domain:** E-Commerce
**Deployment Platform:** AWS EC2
**CI/CD Tools:** GitHub Actions and Jenkins


## 2. Project Objectives

- Develop a full-stack e-commerce application.
- Implement source code management using Git and GitHub.
- Automate build and validation using GitHub Actions.
- Integrate SonarCloud for static code quality and security analysis.
- Containerize the application using Docker.
- Publish versioned Docker images to Docker Hub.
- Automate deployment using Jenkins.
- Deploy the application on AWS EC2.
- Configure Nginx as a reverse proxy.
- Maintain persistent MySQL database storage.
- Verify application availability through health checks.



## 3. Technology Stack

| Category | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Version Control | Git, GitHub |
| Continuous Integration | GitHub Actions |
| Code Quality Analysis | SonarCloud |
| Containerization | Docker |
| Container Registry | Docker Hub |
| Continuous Deployment | Jenkins |
| Cloud Infrastructure | AWS EC2 |
| Reverse Proxy | Nginx |
| Container Management | Docker Compose |
| Operating System | Ubuntu Linux |
| Package Management | npm |



## 4. Application Features

### Customer Module

- User registration and login.
- Product browsing and product details.
- Product categories.
- Shopping cart management.
- Cart quantity updates.
- Customer order placement.

### Administrator Module

- Administrator authentication.
- Product management.
- Category management.
- Inventory management.

### Backend Module

- RESTful API development.
- Node.js and Express.js integration.
- MySQL database connectivity.
- Authentication and authorization.
- Product, cart and order management.
- Application health monitoring endpoint.

---

## 5. System Architecture

The project follows an automated CI/CD architecture connecting GitHub, GitHub Actions, SonarCloud, Docker Hub, Jenkins and AWS EC2.

### Architecture Diagram

mermaid
flowchart TD
    A["Developer"] --> B["GitHub Repository"]
    B --> C["GitHub Actions CI"]
    C --> D["Dependency Installation"]
    D --> E["JavaScript Validation"]
    E --> F["Docker Build Validation"]
    C --> G["SonarCloud Analysis"]
    F --> H["Docker Image Publishing"]
    H --> I["Docker Hub Registry"]
    I --> J["Jenkins Image Polling"]
    J --> K["AWS EC2 - Ubuntu"]
    K --> L["Docker Compose"]
    L --> M["FarmFresh Application"]
    L --> N["MySQL Database"]
    O["Internet Users"] --> P["Nginx Reverse Proxy"]
    P --> M
    M --> N


### Architecture Components

| Component | Responsibility |
|---|---|
| GitHub | Source code repository |
| GitHub Actions | Automated CI and image publishing |
| SonarCloud | Static code analysis |
| Docker Hub | Docker image storage |
| Jenkins | Automated deployment orchestration |
| AWS EC2 | Cloud hosting infrastructure |
| Docker Compose | Application and database container management |
| Nginx | HTTP reverse proxy |
| MySQL | Persistent application database |

### Deployment Workflow

1. Developer pushes changes to the GitHub main branch.
2. GitHub Actions triggers the CI workflow.
3. Backend dependencies are installed.
4. JavaScript syntax is validated.
5. Docker image build is validated.
6. SonarCloud performs code quality analysis through the configured integration.
7. After successful CI validation, the Docker image is published to Docker Hub.
8. Jenkins periodically checks Docker Hub for an updated image.
9. Jenkins connects to AWS EC2 through SSH.
10. Jenkins pulls the latest application image.
11. Docker Compose updates the application container when a new image is detected.
12. Jenkins verifies the deployment using the application health endpoint.



## 6. CI/CD Pipeline Implementation

### 6.1 GitHub Actions – Continuous Integration

GitHub Actions automates the continuous integration process.

**Workflow File:**

`.github/workflows/ci.yml`

**Triggers:**

- Push to the `main` branch.
- Pull requests targeting the `main` branch.

**Pipeline Stages:**

1. Checkout source code.
2. Configure Node.js.
3. Install backend dependencies.
4. Validate JavaScript syntax.
5. Build the Docker image.
6. Publish the Docker image to Docker Hub after successful validation.

**CI Security Measures:**

- Restricted GitHub Actions permissions.
- Docker publishing actions pinned to full commit SHAs.
- npm dependency installation with `--ignore-scripts`.
- Docker Hub credentials stored in GitHub Secrets.

**Workflow Source:**

[View GitHub Actions CI Workflow](https://github.com/madasuswathi/CI-CD_Pipeline_GitHub_actions_project/blob/main/.github/workflows/ci.yml)

### 6.2 Jenkins – Continuous Deployment

Jenkins automates the deployment of the FarmFresh application to AWS EC2.

**Pipeline File:** `Jenkinsfile`

**Jenkins Job:** `FarmFresh-project`

**Deployment Process:**

1. Jenkins checks Docker Hub periodically using a five-minute polling schedule.
2. Detects whether a new application image is available.
3. Establishes an SSH connection to the AWS EC2 server.
4. Pulls the latest Docker image.
5. Compares the existing and newly downloaded image IDs.
6. Updates the application container when a new image is detected.
7. Preserves the existing MySQL service and persistent database volume.
8. Executes an application health check.
9. Verifies the application container status.

The deployment process updates the application service without intentionally resetting the database or removing its persistent volume.

**Pipeline Source:**

[View Jenkinsfile](https://github.com/madasuswathi/CI-CD_Pipeline_GitHub_actions_project/blob/main/Jenkinsfile)

### 6.3 Continuous Delivery Workflow

The project uses GitHub Actions for CI and Docker image publishing, while Jenkins handles automated deployment to AWS EC2.

This separation provides independent build and deployment responsibilities.


## 7. Containerization and Docker Hub

Docker is used to package the FarmFresh application and its runtime dependencies into a portable container image.

### Docker Image

**Docker Hub Repository:**

https://hub.docker.com/r/madasuswathi/farmfresh-ecommerce

**Image Tags:**

text
madasuswathi/farmfresh-ecommerce:latest
madasuswathi/farmfresh-ecommerce:<commit-sha>


### Docker Benefits

- Consistent runtime environment.
- Application portability.
- Simplified deployment.
- Container isolation.
- Versioned image management.
- Faster application updates.

### Docker Compose

Docker Compose manages the application and database services.

| Service | Responsibility |
|---|---|
| app | FarmFresh Node.js application |
| db | MySQL database |

The application communicates with MySQL through Docker networking.

Persistent storage is configured for the MySQL database to protect existing application data during application container updates.



## 8. AWS Cloud Deployment

The FarmFresh application is hosted on an AWS EC2 Ubuntu server.

### Infrastructure Components

| Component | Configuration / Purpose |
|---|---|
| Cloud Provider | Amazon Web Services |
| Compute | EC2 instance |
| Operating System | Ubuntu Linux |
| Container Runtime | Docker |
| Container Management | Docker Compose |
| Web Server | Nginx |
| Database | MySQL |
| Deployment Automation | Jenkins |

### Application Deployment

The application is accessible through Nginx on HTTP port 80.

Nginx forwards incoming requests to the application running inside Docker.

The application container is mapped to the EC2 host on port 5001, bound to localhost.

The MySQL database is maintained in persistent Docker storage and is not intended to be publicly accessible.

### Live Application

**Website:**

http://3.108.51.128

**API Health Endpoint:**

http://3.108.51.128/api/health

**Expected Health Response:**

```json
{
  "status": "UP",
  "application": "FarmFresh",
  "database": "Connected"
}
```

The health endpoint verifies application availability and database connectivity.



## 9. Security Implementation

Security practices implemented in the project include:

- GitHub Secrets for sensitive Docker Hub credentials.
- Environment files excluded from Git version control.
- Restricted GitHub Actions workflow permissions.
- Full commit SHA pinning for Docker publishing actions.
- npm lifecycle scripts disabled during dependency installation.
- Express `x-powered-by` header disabled.
- Explicit CORS origin allow-list.
- SSH-based deployment authentication.
- AWS Security Group restrictions.
- Database port not exposed publicly.
- Persistent database storage.
- Application health verification after deployment.

**Security Principle:** Sensitive credentials and database configuration are maintained outside the source code repository.


## 10. SonarCloud Code Quality

SonarCloud is used for static code analysis and code quality monitoring.

It helps identify:

- Security vulnerabilities.
- Reliability issues.
- Maintainability issues.
- Security hotspots.
- Dependency risks.
- Code duplication.
- Test coverage information.

### SonarCloud Project

[Open FarmFresh SonarCloud Project](https://sonarcloud.io/project/overview?id=madasuswathi_CI-CD_Pipeline_GitHub_actions_project)

[View SonarCloud Issues](https://sonarcloud.io/project/issues?types=VULNERABILITY&open=true&id=madasuswathi_CI-CD_Pipeline_GitHub_actions_project)

[View SonarCloud Quality Gate](https://sonarcloud.io/summary/overall?id=madasuswathi_CI-CD_Pipeline_GitHub_actions_project)

### Previously Observed Quality Metrics

The following values were observed in an earlier analysis and are included as a historical baseline. They are not represented as the current analysis results.

| Quality Metric | Previously Observed Result |
|---|---|
| Security | C |
| Reliability | A |
| Maintainability | A |
| Security Hotspots Reviewed | 100% |
| Dependency Risks | A |
| Code Coverage | 0.0% |
| Code Duplication | 0% |

Refer to the live SonarCloud project for the latest analysis, issue counts and Quality Gate result.



## 11. Project Links

All important project resources and deployment links are provided below.

| Resource | Link |
|---|---|
| GitHub Repository | [FarmFresh Source Code](https://github.com/madasuswathi/CI-CD_Pipeline_GitHub_actions_project) |
| GitHub Actions Workflow | [CI Pipeline](https://github.com/madasuswathi/CI-CD_Pipeline_GitHub_actions_project/blob/main/.github/workflows/ci.yml) |
| Jenkins Pipeline | [Jenkinsfile](https://github.com/madasuswathi/CI-CD_Pipeline_GitHub_actions_project/blob/main/Jenkinsfile) |
| Docker Hub | [FarmFresh Docker Image](https://hub.docker.com/r/madasuswathi/farmfresh-ecommerce) |
| SonarCloud | [Code Quality Dashboard](https://sonarcloud.io/project/overview?id=madasuswathi_CI-CD_Pipeline_GitHub_actions_project) |
| SonarCloud Issues | [Security Vulnerability Issues](https://sonarcloud.io/project/issues?types=VULNERABILITY&open=true&id=madasuswathi_CI-CD_Pipeline_GitHub_actions_project) |
| SonarCloud Quality Gate | [Quality Gate Dashboard](https://sonarcloud.io/summary/overall?id=madasuswathi_CI-CD_Pipeline_GitHub_actions_project) |
| AWS Live Website | [FarmFresh Application](http://3.108.51.128) |
| API Health Check | [Application Health](http://3.108.51.128/api/health) |



## 12. Validation and Testing

The following checks are part of the project validation process:

### CI Validation

- GitHub Actions workflow execution.
- npm dependency installation.
- JavaScript syntax validation.
- Docker image build validation.
- Docker Hub image publishing.

### Code Quality Validation

- SonarCloud static code analysis.
- Security issue review.
- Reliability issue review.
- Maintainability issue review.
- Security hotspot review.

### Deployment Validation

- Jenkins pipeline execution.
- SSH connectivity to AWS EC2.
- Docker image pull.
- Docker Compose application update.
- Application container status.
- HTTP health endpoint response.
- Database connectivity.

### Application Validation

- User registration and login.
- Product listing.
- Category browsing.
- Shopping cart operations.
- Order placement.
- Administrator functionality.



## 13. Project Outcomes

The FarmFresh project demonstrates an end-to-end DevOps implementation for a full-stack e-commerce application.

Key outcomes:

- Centralized source code management using GitHub.
- Automated continuous integration using GitHub Actions.
- Static code quality monitoring using SonarCloud.
- Docker-based application containerization.
- Automated Docker image publishing.
- Jenkins-based deployment automation.
- AWS EC2 cloud hosting.
- Nginx reverse proxy configuration.
- Docker Compose service management.
- Persistent MySQL database storage.
- Automated deployment health verification.

The implementation reduces manual deployment activities and provides a repeatable process for delivering application updates.



## 14. Future Enhancements

- Configure a custom domain name.
- Enable HTTPS using SSL/TLS certificates.
- Implement automated database backups.
- Add automated unit and integration tests.
- Improve automated test coverage.
- Configure application monitoring and alerting.
- Introduce automated container vulnerability scanning.
- Implement production-grade deployment strategies.
- Add centralized application logging.



## Project Information

| Detail | Description |
|---|---|
| Project Name | FarmFresh |
| Project Category | Full-Stack E-Commerce and DevOps |
| Backend | Node.js and Express.js |
| Database | MySQL |
| CI | GitHub Actions |
| Code Quality | SonarCloud |
| Containerization | Docker |
| Image Registry | Docker Hub |
| CD | Jenkins |
| Cloud Platform | AWS EC2 |
| Web Server | Nginx |
| Repository | madasuswathi/CI-CD_Pipeline_GitHub_actions_project |


**FarmFresh – Automating Application Delivery from GitHub to AWS.**
