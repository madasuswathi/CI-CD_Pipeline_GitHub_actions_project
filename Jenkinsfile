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
        DEPLOY_HOST = 'ubuntu@3.109.23.202'
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
                    set -eu
                    test -n "$GIT_COMMIT"

                    ssh -i "$SSH_KEY" \\
                        -o BatchMode=yes \\
                        -o StrictHostKeyChecking=yes \\
                        "$DEPLOY_HOST" "IMAGE_TAG=$GIT_COMMIT sh -s" <<'REMOTE'
                    set -eu
                    cd /home/ubuntu/CI-CD_Pipeline_GitHub_actions_project

                    echo "Deploying exact Jenkins commit: $IMAGE_TAG"
                    IMAGE="madasuswathi/farmfresh-ecommerce:$IMAGE_TAG"

                    docker pull "$IMAGE"

                    NEW_IMAGE_ID=$(docker image inspect "$IMAGE" --format "{{.Id}}")
                    RUNNING_IMAGE_ID=$(docker inspect farmfresh-app --format "{{.Image}}" 2>/dev/null || true)
                    RUNNING=$(docker inspect farmfresh-app --format "{{.State.Running}}" 2>/dev/null || echo false)

                    echo "Target image: $NEW_IMAGE_ID"
                    echo "Running image: $RUNNING_IMAGE_ID"

                    if [ "$NEW_IMAGE_ID" != "$RUNNING_IMAGE_ID" ] || [ "$RUNNING" != "true" ]; then
                        echo "Deploying commit image..."
                        IMAGE_TAG="$IMAGE_TAG" docker compose up -d --no-deps app
                    else
                        echo "This commit is already running."
                    fi

                    curl --fail --silent --show-error --retry 20 --retry-connrefused --retry-all-errors --retry-delay 3 --retry-max-time 90 http://127.0.0.1:5001/api/health
                    echo
                    docker compose ps app
REMOTE
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
