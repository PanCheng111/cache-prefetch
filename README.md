# Profile based cache line prefetch

This is a simple desktop app that lets you profile your code and find out how many misses happend per line.
Besides, this app can help you auto prefetch some important data, which can improve the overall performance.

## Screenshots
![](./screenshots/demo.gif)

## Update npm and node
```
sudo npm install -g n
sudo n stable
npm uninstall
npm install
npm install electron --save-dev
```

## Pre install
This project depends on *Valgrind*, which can be found at http://valgrind.org/.
We need to download the source, make and make install.
```
wget ftp://sourceware.org/pub/valgrind/valgrind-3.13.0.tar.bz2
tar -xvf valgrind-3.13.0.tar.bz2
cd valgrind-3.13.0
./configure
make & make install
```

## How to install
```
git clone https://github.com/PanCheng111/software-analysis-project
cd software-analysis-project
npm install
```

## How to run

```
npm start
```
## Technologies involved

+ Electron
+ Nodejs
+ NeDB
+ Ace Editor for Syntax Highlighting 
+ Node-c-parser for AST build
+ Valgrind for Cache Miss Profiling

## TODO

- [ ] Add pointer chase analysis algorithm.

- [ ] Creating installation packages for Windows, Mac and Linux

- [ ] Optimise cache prefetching scheme.

- [ ] UI improvements
