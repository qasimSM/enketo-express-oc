#!/bin/sh -u

# exit if an error occurs
set -e

# If the repo directory hasn't been externally specified, default to `/vagrant`.
ENKETO_EXPRESS_REPO_DIR=${ENKETO_EXPRESS_REPO_DIR:-"/vagrant"}

ENKETO_EXPRESS_UPDATE_REPO=${ENKETO_EXPRESS_UPDATE_REPO:-"true"}
ENKETO_EXPRESS_USE_NODE_ENV=${ENKETO_EXPRESS_USE_NODE_ENV:-"false"}

# install redis
echo 'installing redis...'
apt-get update
apt-get upgrade -y
apt-get install -y redis-server

# further redis setup with persistence, security, logging, multiple instances, priming 
echo 'Setting up Redis instances...'
if [ -f "/etc/redis/redis.conf" ]; then
    systemctl stop redis
    systemctl disable redis
    systemctl daemon-reload
    
    echo 'Moving redis configs...'
    mv /etc/redis/redis.conf /etc/redis/redis-origin.conf
    cp -f $ENKETO_EXPRESS_REPO_DIR/setup/redis/conf/redis-enketo-main.conf /etc/redis/
    cp -f $ENKETO_EXPRESS_REPO_DIR/setup/redis/conf/redis-enketo-cache.conf /etc/redis/
    systemctl enable redis-server@enketo-main.service
    systemctl enable redis-server@enketo-cache.service

    #chown redis:redis /var/lib/redis/

    #if [ -f "/var/lib/redis/redis.rdb" ]; then
	   #rm /var/lib/redis/redis.rdb
    #fi
    echo 'Copying enketo default redis db...'
    cp -f $ENKETO_EXPRESS_REPO_DIR/setup/redis/enketo-main.rdb /var/lib/redis/
    chown redis:redis /var/lib/redis/enketo-main.rdb
    chmod 660 /var/lib/redis/enketo-main.rdb
fi

echo 'Starting first enketo redis instance (systemd)...'
systemctl start redis-server@enketo-main.service

echo 'Starting second enketo redis instance (systemd)...'
systemctl start redis-server@enketo-cache.service

# install dependencies, development tools, node, grunt
echo 'installing some apt-get packages...'
apt-get install -y build-essential git python libfontconfig curl
echo 'installing nodejs...'
cd $ENKETO_EXPRESS_REPO_DIR
if [ $ENKETO_EXPRESS_USE_NODE_ENV = "true" ]; then
    apt-get install python-pip
    pip install nodeenv
    nodeenv env
    . env/bin/activate
else
    # using nvm as xenial is not officially supported for NodeJS 4?
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    nvm install 4
    nvm use 4
fi

# create a local configuration file unless it already exists
echo 'copying custom configuration unless config.json already exists'
if [ ! -f "$ENKETO_EXPRESS_REPO_DIR/config/config.json" ]; then
    cp setup/config/config.json config/config.json
fi

# remove node_modules if exists because npm builds can be system-specific
if [ -d "$ENKETO_EXPRESS_REPO_DIR/node_modules" ]; then
	rm -R $ENKETO_EXPRESS_REPO_DIR/node_modules
fi
#npm -g install npm@2.14.3
npm install -g grunt-cli gulp nodemon mocha
npm install --production

# build js and css
grunt

# still installing pm2 but not using in script any more. Because it runs invisibly when started as root.
if [ $(whoami) = "root" ]; then
    npm install pm2@latest -g --unsafe-perm
else
    npm install pm2@latest -g
fi

echo "**************************************************************************************"
echo "***                        Enketo Express is installed!                           ****"
echo "***                                                                               ****"
echo "*** You can start it by ssh-ing into the VM and running: cd /vagrant && npm start ****"
echo "***                 ( or with: pm2 start /vagrant/app.js -n enketo )              ****"
echo "**************************************************************************************"

