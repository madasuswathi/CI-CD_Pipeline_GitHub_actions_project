pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        DOCKER_IMAGE = 'madasuswathi/farmfresh-ecommerce:latest'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                checkout scm
                echo 'FarmFresh source code checked out successfully.'
            }
        }

        stage('Pull Docker Image') {
            steps {
                sh 'docker pull "$DOCKER_IMAGE"'
            }
        }

        stage('Verify Docker Image') {
            steps {
                sh 'docker image inspect "$DOCKER_IMAGE"'
                echo 'FarmFresh Docker image verified successfully.'
            }
        }
    }

    post {
        success {
            echo 'FarmFresh Jenkins pipeline completed successfully.'
        }
        failure {
            echo 'FarmFresh Jenkins pipeline failed. Check the console output.'
        }
    }
}
