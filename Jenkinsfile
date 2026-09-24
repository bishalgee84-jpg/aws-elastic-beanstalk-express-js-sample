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

        // We perform checkout explicitly in the Checkout stage.
        skipDefaultCheckout(true)
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
                echo 'Installing dependencies using Node.js 16 container...'

                sh '''
                    docker run --rm \
                    --user 1000:1000 \
                    -v "$WORKSPACE:/workspace" \
                    -w /workspace \
                    node:16-bullseye \
                    sh -c "node --version && npm --version && npm ci"
                '''
            }
        }


        stage('Unit Tests') {
            steps {
                echo 'Running unit tests using Node.js 16 container...'

                sh '''
                    docker run --rm \
                    --user 1000:1000 \
                    -v "$WORKSPACE:/workspace" \
                    -w /workspace \
                    node:16-bullseye \
                    sh -c 'bash -o pipefail -c "npm test | tee test-output.txt"'
                '''
            }
        }


        stage('Dependency Security Scan') {
            steps {
                script {

                    echo 'Scanning production dependencies using Node.js 16 container...'

                    def auditStatus = sh(
                        script: '''
                            docker run --rm \
                            --user 1000:1000 \
                            -v "$WORKSPACE:/workspace" \
                            -w /workspace \
                            node:16-bullseye \
                            sh -c 'npm audit --omit=dev --audit-level=high --json > npm-audit.json'
                        ''',
                        returnStatus: true
                    )

                    echo 'Displaying readable npm audit results...'

                    sh '''
                        docker run --rm \
                        --user 1000:1000 \
                        -v "$WORKSPACE:/workspace" \
                        -w /workspace \
                        node:16-bullseye \
                        sh -c 'npm audit --omit=dev || true'
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


        stage('Build Docker Image') {
            steps {
                echo 'Building application Docker image...'

                sh '''
                    docker build \
                    -t "$IMAGE_NAME:$BUILD_NUMBER" \
                    -t "$IMAGE_NAME:latest" \
                    .
                '''

                echo 'Saving Docker image metadata as a build artifact...'

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

                    echo 'Authenticating securely with Docker Hub...'

                    sh '''
                        echo "$DOCKER_PASS" | \
                        docker login \
                        -u "$DOCKER_USER" \
                        --password-stdin
                    '''

                    echo 'Pushing versioned Docker image...'

                    sh '''
                        docker push "$IMAGE_NAME:$BUILD_NUMBER"
                    '''

                    echo 'Pushing latest Docker image...'

                    sh '''
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
            echo 'CI/CD pipeline failed. Review the stage logs above.'
        }

        aborted {
            echo 'CI/CD pipeline was manually aborted.'
        }

        always {

            echo 'Archiving pipeline evidence...'

            archiveArtifacts(
                artifacts: 'npm-audit.json,test-output.txt,docker-image-inspect.json',
                allowEmptyArchive: true,
                fingerprint: true
            )

            echo 'Logging out from Docker Hub...'

            sh 'docker logout || true'
        }
    }
}
