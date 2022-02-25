### Deploy from a release zip file

1. Unzip file on Linux server
2. Install the same nodejs version as in the filename of the zipped release
3. Install grunt-cli with `npm install -g grunt-cli`
4. Do `npm rebuild` from the enketo-express-oc folder
5. Configure Enketo with your custom config.json (or environment variables)
6. Do `grunt` to build.

### Issues?

If this Vagrantfile below still works, it may help figure out what the issue is.

This assumes the Vagrantfile with the content below is placed in some folder (e.g. "test") and that the unzipped "enketo-express-oc" folder is inside that "test" folder.

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/bionic64"
  config.vm.box_check_update = false

  config.vm.provider "virtualbox" do |v|
     v.memory = 2048
     v.cpus = 2
  end

  config.vm.provision "shell", inline: <<-SHELL
     curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
     apt-get install -y build-essential nodejs
     npm install -g grunt-cli
     cd /vagrant/enketo-express-oc && npm rebuild
  SHELL
end
```

1. run `vagrant up` from the folder containing the Vagrantfile
2. do `vagrant ssh` when done
3. do `cd /vagrant/enketo-express-oc`
4. run `grunt`
