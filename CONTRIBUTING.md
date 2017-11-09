# Contributing

The following is a set of guidelines for contributing to the *Mongo Portable* package. These are mostly guidelines, not rules.
Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table Of Contents

* [Code of Conduct](#code-of-conduct)
* [How Can I Contribute?](#how-can-i-contribute)
    * [Reporting Bugs](#reporting-bugs)
    * [Suggesting and Enhancements](#suggesting-and-enhancements)
    * [Pull Requests](#pull-requests)
* [Styleguides](#styleguides)
    * [Git Commit Messages](#git-commit-messages)
    * [TypeScript Styleguide](#typeScript-styleguide)
    * [Documentation Styleguide](#documentation-styleguide)
* [Additional Notes](#additional-notes)
	* [Issue and Pull Request Labels](#issue-and-pull-request-labels)


## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable behavior to eduardo.astolfi91.com.

## How Can I Contribute?

### Reporting Bugs

Feel free to reporting new bugs, but check first if there is an issue already filled. If you find a related issue that has been closed,
please, open a new issue and link it.

When opening a new issue, please fill in [the template](ISSUE_TEMPLATE.md), explain the problem and include additional details to
help maintainers reproduce the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible. For example, start by explaining how you started Atom, e.g. which command exactly you used in the terminal, or how you started Atom otherwise. When listing steps, **don't just say what you did, but explain how you did it**. For example, if you moved the cursor to the end of a line, explain if you used the mouse, or a keyboard shortcut or an Atom command, and if so which one?
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples. If you're providing snippets in the issue, use [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Which version are you using?**


### Suggesting and Enhancements

When suggesting a new feature or enhancement, do the same as you would do with an issue, including the steps that you imagine you would take if the feature you're requesting existed

### Pull Requests

* Fill in [the required template](PULL_REQUEST_TEMPLATE.md)
* Do not include issue numbers in the PR title
* Follow the [TypeScript](#typescript-styleguide) styleguides.
* Include thoughtfully-worded, well-structured [Mocha](https://mochajs.org/) + [Chai Expect](http://chaijs.com/guide/styles/#expect) specs in the `./test/unit` folder. Run them by `npm run test`
* Document new code based on the [Documentation Styleguide](#documentation-styleguide)
* End all files with a newline
* Place requires in the following order:
    * Built in Node Modules (such as `path`)
    * Local Modules (using relative paths)
* Place class properties in the following order:
    * Static properties
    * Instance properties
    * Instance methods
    * Static methods
    * All of them following the order of privacy: public -> protected -> private


## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* When only changing documentation, include `[ci skip]` in the commit description
* Start the commit message with a word following [this convention](https://github.com/conventional-changelog-archived-repos/conventional-changelog-angular/blob/master/convention.md):
    * feat: when adding new functionallities
    * fix: when correcting a bug
    * test: when fixing or adding test cases
    * doc: when the change is related to the documentation
    * chore: when the change is related to building/other sections not included here
    * perf: when improving the performance
    * revert: when reverting a commit
    * format: when the change affects formatting code
* Also, consider including:
    * BREAKING CHANGE: when breaking some functionallity
    * Closes #1: when fixing some issue

### TypeScript Styleguide

Please make sure that `npm run lint` works without problems

### Documentation Styleguide

* Use [TypeDoc](https://github.com/TypeStrong/typedoc) within the code.
* Add a method/class description
* Add `@param {type} parameter` and `@returns {type} - Description`
* Reference methods and classes `{@link ClassName#methodName}` notation:

### Test Styleguide

- Include thoughtfully-worded, well-structured [Mocha](https://mochajs.org/) + [Chai Expect](http://chaijs.com/guide/styles/#expect) specs in the `./test/unit` folder.
- Treat `describe` as a noun or situation.
- Treat `it` as a statement about state or how an operation changes state.
- Treat `expect` as a confirmation statement


## Additional Notes

## Issue and Pull Request Labels

#### Type of Issue and Issue State

The following labels are available to search for issues / pull requests and their state:

### Issue Labels

| Label name | Issues | Description |
| --- | --- | --- |
| `enhancement` | [search][search-issue-enhancement] | Feature requests. |
| `proposal` | [search][search-issue-proposal] | Feature requests not accepted yet. |
| `bug` | [search][search-issue-bug] | Confirmed bugs or reports that are very likely to be bugs. |
| `question` | [search][search-issue-question] | Questions more than bug reports or feature requests (e.g. how do I do X). |
| `feedback` | [search][search-issue-feedback] | General feedback more than bug reports or feature requests. |
| `help-wanted` | [search][search-issue-help-wanted] | Issues that need some help to be solved. |
| `beginner` | [search][search-issue-beginner] | Less complex issues which would be good first issues to work on for users who want to contribute. |
| `more-information-needed` | [search][search-issue-more-information-needed] | More information needs to be collected about these problems or feature requests (e.g. steps to reproduce). |
| `needs-reproduction` | [search][search-issue-needs-reproduction] | Likely bugs, but haven't been reliably reproduced. |
| `blocked` | [search][search-issue-blocked] | Issues blocked on other issues. |
| `duplicate` | [search][search-issue-duplicate] | Issues which are duplicates of other issues, i.e. they have been reported before. |
| `wontfix` | [search][search-issue-wontfix] | Issues that are not being fixed for now, either because they're working as intended or for some other reason. |
| `invalid` | [search][search-issue-invalid] | Issues which aren't valid (e.g. user errors). |
| `review` | [search][search-issue-review] | For reviewing some aspects |

#### Topics

| Label name | Topics | Description |
| --- | --- | --- |
| `documentation` | [search][search-issue-documentation] | Related to any type of documentation. |
| `performance` | [search][search-issue-performance] | Related to performance. |
| `security` | [search][search-issue-security] | Related to security. |
| `build-error` | [search][search-issue-build-error] | Related to problems with the building chain. |

#### Pull Request Labels

| Label name | Pull Requests | Description
| --- | --- | --- |
| `work-in-progress` | [search][search-issue-work-in-progress] | Pull requests which are still being worked on, more changes will follow. |
| `needs-review` | [search][search-issue-needs-review] | Pull requests which need code review, and approval from maintainers. |
| `under-review` | [search][search-issue-under-review] | Pull requests being reviewed by maintainers. |
| `requires-changes` | [search][search-issue-requires-changes] | Pull requests which need to be updated based on review comments and then reviewed again. |
| `needs-testing` | [search][search-issue-needs-testing] | Pull requests which need manual testing. |

[search-issue-enhancement]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aenhancement
[search-issue-proposal]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aenhancement
[search-issue-bug]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Abug
[search-issue-question]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aquestion
[search-issue-feedback]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Afeedback
[search-issue-help-wanted]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Ahelp-wanted
[search-issue-beginner]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Abeginner
[search-issue-more-information-needed]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Amore-information-needed
[search-issue-needs-reproduction]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aneeds-reproduction
[search-issue-documentation]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Adocumentation
[search-issue-performance]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aperformance
[search-issue-security]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Asecurity
[search-issue-blocked]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Ablocked
[search-issue-duplicate]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aduplicate
[search-issue-wontfix]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Awontfix
[search-issue-invalid]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Ainvalid
[search-issue-review]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Ainvalid
[search-issue-build-error]: https://github.com/issues?q=is%3Aopen+is%3Aissue+repo%3AEastolfiWebDev%2FMongoPortable+label%3Abuild-error
[search-issue-work-in-progress]: https://github.com/pulls?q=is%3Aopen+is%3Apr+repo%3AEastolfiWebDev%2FMongoPortable+label%3Awork-in-progress
[search-issue-needs-review]: https://github.com/pulls?q=is%3Aopen+is%3Apr+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aneeds-review
[search-issue-under-review]: https://github.com/pulls?q=is%3Aopen+is%3Apr+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aunder-review
[search-issue-requires-changes]: https://github.com/pulls?q=is%3Aopen+is%3Apr+repo%3AEastolfiWebDev%2FMongoPortable+label%3Arequires-changes
[search-issue-needs-testing]: https://github.com/pulls?q=is%3Aopen+is%3Apr+repo%3AEastolfiWebDev%2FMongoPortable+label%3Aneeds-testing