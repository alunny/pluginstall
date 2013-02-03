# Pluginstall

> script to install Cordova plugins

## Deprecation Notice

This repo is no longer under active development. For your Cordova plugin needs, please see

https://github.com/imhotep/plugman

## Usage

    pluginstall PLATFORM PROJECT-PATH PLUGIN-PATH

Example:

    pluginstall android . ~/plugins/ChildBrowser

## Development

    git clone https://github.com/alunny/pluginstall.git
    cd pluginstall
    npm install
    npm test

Then go!

## Supported Platforms

* Android
* iOS
* www (copies plugin's www assets only, to PROJECT-PATH)

## plugin.xml Format

see https://github.com/alunny/cordova-plugin-spec

Currently support the August 16 revision, more or less.

## License

Apache
