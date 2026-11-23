pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        DEPLOY_HOST = 'ubuntu@3.108.51.128'
        DEPLOY_DIR = '/home/ubuntu/CI-CD_Pipeline_GitHub_actions_project'
        SSH_KEY = '/var/lib/jenkins/.ssh/farmfresh_ec2_deploy'
        DOCKER_IMAGE = 'madasuswathi/farmfresh-ecommerce:latest'
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                checkout scm
                echo 'FarmFresh source code checked out successfully.'
            }
        }

        stage('Verify Docker Image') {
            steps {
                echo "Deployment image: ${DOCKER_IMAGE}"
                sh 'test -f "$SSH_KEY"'
            }
        }

        stage('Deploy to AWS EC2') {
            steps {
                sh '''
                    ssh -i "$SSH_KEY" \
                        -o BatchMode=yes \
                        -o StrictHostKeyChecking=yes \
                        "$DEPLOY_HOST" \
                        "cd '$DEPLOY_DIR' && \
                         docker compose pull app && \
                         docker compose up -d --no-deps app && \
                         curl -fsS http://127.0.0.1:5001/api/health && \
                         echo && \
                         docker compose ps app"
                '''
            }
        }
    }

    post {
        success {
            echo 'FarmFresh deployment completed successfully on AWS EC2.'
        }
        failure {
            echo 'FarmFresh deployment failed. Check the console output.'
        }
    }
}
