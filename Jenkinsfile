pipeline {

    agent any

    environment {
        IMAGE_NAME = 'greyidk/isec6000-node-app'
    }

    options {
        timestamps()

        buildDiscarder(
            logRotator(
                numToKeepStr: '10',
                artifactNumToKeepStr: '10'
            )
        )
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    docker.image('node:16-bullseye')
                        .inside('--user 1000:1000') {

                        echo 'Checking Node.js version...'
                        sh 'node --version'
                        sh 'npm --version'

                        echo 'Installing dependencies...'
                        sh 'npm ci'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    docker.image('node:16-bullseye')
                        .inside('--user 1000:1000') {

                        echo 'Running unit tests...'

                        sh '''
                            bash -o pipefail -c \
                            "npm test | tee test-output.txt"
                        '''
                    }
                }
            }
        }

        stage('Dependency Security Scan') {
            steps {
                script {
                    docker.image('node:16-bullseye')
                        .inside('--user 1000:1000') {

                        echo 'Scanning production dependencies...'

                        def auditStatus = sh(
                            script: '''
                                npm audit \
                                --omit=dev \
                                --audit-level=high \
                                --json > npm-audit.json
                            ''',
                            returnStatus: true
                        )

                        echo 'Readable npm audit output:'

                        sh '''
                            npm audit --omit=dev || true
                        '''

                        if (auditStatus != 0) {
                            error(
                                'SECURITY GATE FAILED: High or Critical dependency vulnerabilities detected.'
                            )
                        }

                        echo 'Security gate passed: no High/Critical vulnerabilities detected.'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'

                sh '''
                    docker build \
                    -t "$IMAGE_NAME:$BUILD_NUMBER" \
                    -t "$IMAGE_NAME:latest" \
                    .
                '''

                sh '''
                    docker image inspect \
                    "$IMAGE_NAME:$BUILD_NUMBER" \
                    > docker-image-inspect.json
                '''
            }
        }

        stage('Push Docker Image') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {

                    echo 'Authenticating with Docker Hub...'

                    sh '''
                        echo "$DOCKER_PASS" | \
                        docker login \
                        -u "$DOCKER_USER" \
                        --password-stdin
                    '''

                    echo 'Pushing Docker images...'

                    sh '''
                        docker push "$IMAGE_NAME:$BUILD_NUMBER"
                        docker push "$IMAGE_NAME:latest"
                    '''
                }
            }
        }
    }

    post {

        success {
            echo 'CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'CI/CD pipeline failed. Review the logs above.'
        }

        always {

            archiveArtifacts(
                artifacts: 'npm-audit.json,test-output.txt,docker-image-inspect.json',
                allowEmpty: true,
                fingerprint: true
            )

            sh 'docker logout || true'
        }
    }
}
