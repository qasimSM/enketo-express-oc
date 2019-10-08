#!/bin/sh
OS=$TRAVIS_OS_NAME
echo "Creating release in environment: Node version: ${TRAVIS_NODE_VERSION} for tag: ${TRAVIS_TAG} in ${OS}..."

TARGET_BASE="../enketo-express-packages"
FILENAME="enketo-express-oc"

# Clean up node_modules to reduce zip file size
npm prune --production

# Create the directory 
mkdir -p ${TARGET_BASE}

# Create a file containing the git tag
echo ${TRAVIS_TAG} > .tag.txt

# Create zip file:
cd ${TARGET_BASE}
zip -rq9 ${FILENAME}_node${TRAVIS_NODE_VERSION}_${OS}.zip ../enketo-express-oc -x "*.git*" "*/public/js/src/*" "*/public/js/*-bundle.js" "*/setup/*" "*/test/*" "*/doc/*"