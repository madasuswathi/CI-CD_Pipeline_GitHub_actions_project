pipeline {
    agent any

    triggers {
        cron('H/5 * * * *')
    }

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

        stage('Verify Deployment Access') {
            steps {
                sh 'test -f "$SSH_KEY"'
            }
        }

        stage('Check Docker Hub and Deploy If Changed') {
            steps {
                sh '''
                    ssh -i "$SSH_KEY" \
                        -o BatchMode=yes \
                        -o StrictHostKeyChecking=yes \
                        "$DEPLOY_HOST" \
                        'set -eu
                         cd /home/ubuntu/CI-CD_Pipeline_GitHub_actions_project
                         echo "Checking Docker Hub..."
                         docker compose pull app

                         NEW_IMAGE_ID=$(docker image inspect madasuswathi/farmfresh-ecommerce:latest --format "{{.Id}}")
                         RUNNING_IMAGE_ID=$(docker inspect farmfresh-app --format "{{.Image}}" 2>/dev/null || true)
                         RUNNING=$(docker inspect farmfresh-app --format "{{.State.Running}}" 2>/dev/null || echo false)

                         echo "Latest image: $NEW_IMAGE_ID"
                         echo "Running image: $RUNNING_IMAGE_ID"

                         if [ "$NEW_IMAGE_ID" != "$RUNNING_IMAGE_ID" ] || [ "$RUNNING" != "true" ]; then
                             echo "New image detected. Deploying..."
                             docker compose up -d --no-deps app
                         else
                             echo "No new image. Deployment unchanged."
                         fi

                         curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 3 http://127.0.0.1:5001/api/health
                         echo
                         docker compose ps app'
                '''
            }
        }
    }

    post {
        success {
            echo 'FarmFresh automatic deployment check completed successfully.'
        }
        failure {
            echo 'FarmFresh deployment check failed. Review the console output.'
        }
    }
}
