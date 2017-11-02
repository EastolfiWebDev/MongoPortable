<a name="Unreleased"></a>
# [Unreleased](https://github.com/EastolfiWebDev/MongoPortable/compare/2.0.0-rc1...43e979e) (2017-11-02)


### Bug Fixes

* Remove all documents if no selection passed. Closes [#6](https://github.com/EastolfiWebDev/MongoPortable/issues/6) ([43e979e](https://github.com/EastolfiWebDev/MongoPortable/commit/43e979e))


### Features

* Add a base store to be overriden ([0e7b780](https://github.com/EastolfiWebDev/MongoPortable/commit/0e7b780))
* Add multi connection support ([8cd9811](https://github.com/EastolfiWebDev/MongoPortable/commit/8cd9811))



<a name="2.0.0-rc1"></a>
# [2.0.0-rc1](https://github.com/EastolfiWebDev/MongoPortable/compare/1.4.0...2.0.0-rc1) (2017-10-24)


### Bug Fixes

* Correct emit when no store ([fa45f12](https://github.com/EastolfiWebDev/MongoPortable/commit/fa45f12))


### Code Refactoring

* Drop all sync methods in Collection. ([65a7b88](https://github.com/EastolfiWebDev/MongoPortable/commit/65a7b88))


### Features

* Add multi connection support ([1982ca6](https://github.com/EastolfiWebDev/MongoPortable/commit/1982ca6))


### BREAKING CHANGES

* All methods now return a Promise. options.chain is now deprecated.



<a name="1.4.0"></a>
# [1.4.0](https://github.com/EastolfiWebDev/MongoPortable/compare/1.3.2...1.4.0) (2017-08-18)


### Features

* **core:** Add getInstance method ([febad5b](https://github.com/EastolfiWebDev/MongoPortable/commit/febad5b))



<a name="1.3.2"></a>
## [1.3.2](https://github.com/EastolfiWebDev/MongoPortable/compare/1.3.1...1.3.2) (2017-01-26)


### Bug Fixes

* Correct an error when emitting events from a collection ([d60ed21](https://github.com/EastolfiWebDev/MongoPortable/commit/d60ed21))



<a name="1.3.1"></a>
## [1.3.1](https://github.com/EastolfiWebDev/MongoPortable/compare/1.3.0...1.3.1) (2017-01-25)


### Bug Fixes

* Solve browser support ([d10406f](https://github.com/EastolfiWebDev/MongoPortable/commit/d10406f))
* Solve issue for unknown name "process" ([58fa3e5](https://github.com/EastolfiWebDev/MongoPortable/commit/58fa3e5))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/EastolfiWebDev/MongoPortable/compare/9b42db2...1.3.0) (2017-01-08)


### Bug Fixes

* **cursor:** Fix when searching by _id ([766d454](https://github.com/EastolfiWebDev/MongoPortable/commit/766d454))
* **selector:** Correcte Selector operators ([b1f3399](https://github.com/EastolfiWebDev/MongoPortable/commit/b1f3399))
* Solve a query problem when using stores ([1bca18d](https://github.com/EastolfiWebDev/MongoPortable/commit/1bca18d))


### Features

* **aggregation:** Add aggregation stages: match, sort ([eba674a](https://github.com/EastolfiWebDev/MongoPortable/commit/eba674a))
* **aggregation:** Add aggregation stages: project ([d2f23eb](https://github.com/EastolfiWebDev/MongoPortable/commit/d2f23eb))
* **aggregation:** Add first aggregation functionallity ([03facba](https://github.com/EastolfiWebDev/MongoPortable/commit/03facba))
* **browser:** Add bower and browser support ([07768c5](https://github.com/EastolfiWebDev/MongoPortable/commit/07768c5))
* **collection:** Add "destroy" and "delete" aliases for Collection#remove ([6fb15e0](https://github.com/EastolfiWebDev/MongoPortable/commit/6fb15e0))
* **collection:** Add method Collection#bulkInsert ([a5641fc](https://github.com/EastolfiWebDev/MongoPortable/commit/a5641fc))
* **module:** Create the module ([9b42db2](https://github.com/EastolfiWebDev/MongoPortable/commit/9b42db2))



