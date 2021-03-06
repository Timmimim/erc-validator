/**
 * (C) Copyright 2017 o2r-project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const fs = require('fs');
const path = require('path');
const assert = require('chai').assert;
const expect = require('chai').expect;
const colors = require('colors');

const checker = require('../index').ercChecker;

var checkConfig = {
	directoryMode: false, 			// read papers from directories automatically?  (false: paths for both papers MUST be specified
	pathToMainDirectory: "",
	pathToOriginalHTML: "",
	pathToReproducedHTML: "",
	saveFilesOutputPath: "",		// necessary if diff-HTML or check metadata should be saved
	saveDiffHTML: false,
	comparisonSetBaseDir: "./",
	ercID: "",
	saveMetadataJSON: false,
	createParentDirectories: false, 	// IF outputPath does not yet exist, this flag MUST be set true; otherwise, the check fails
	quiet: false
};

describe('Using ERC-Checker as node-module', function () {
	var testStringA = "test/TestPapers_1/testPaper_1_shortened_a.html",
		testStringB = "test/TestPapers_1/testPaper_1_shortened_b.html",
		testStringC = "test/TestPapers_2/paper_9_img_A.html",
		testStringD = "test/TestPapers_2/paper_9_img_B.html",
		testStringE = "test/TestPapers_2/paper_9_img_C.html",
		testStringF = "./path/to/nothing",
		testStringText1 = "test/TestPapers_TextDiff/textDiffTest_A.html",
    	testStringText2 = "test/TestPapers_TextDiff/textDiffTest_B.html",
		testStringDirMode = "./test/dirModeTest";

	it('should return a Promise', function () {
		let config = checkConfig;
		config.pathToOriginalHTML = testStringA;
		config.pathToReproducedHTML = testStringB;

		let checkObject1 = checker(config)
			.then(function (resolve) {
			}, function (reason) {
			});
		expect(checkObject1.then()).to.not.equal(undefined);

		config.pathToReproducedHTML = testStringA;
		let checkObject2 = checker(config)
			.then(function (resolve) {
			}, function (reason) {
			});
		expect(checkObject2.then()).to.not.equal(undefined);
	});

	describe('Returned Promise should be *rejected* and Metadata in reject statement should contain Error message, when ERC-Checker', function () {

		it('is called with one or both invalid paths', function () {
			let config = checkConfig;
			config.pathToOriginalHTML = testStringA;
			config.pathToOriginalHTML= testStringF;
			checker(config)
				.then(function (resolve) {
					expect(resolve).to.equal(null);
				}, function (reason) {
					expect(reason.errors[0]).to.not.equal(null);
				});

			config.pathToOriginalHTML = testStringF;
			config.pathToReproducedHTML = testStringA;
			checker(config)
				.then(function (resolve) {
					expect(resolve).to.equal(null);
				}, function (reason) {
					expect(reason.errors[0]).to.not.equal(null);
				});

			config.pathToReproducedHTML = testStringF;
			checker(testStringF, testStringF)
				.then(function (resolve) {
					expect(resolve).to.equal(null);
				}, function (reason) {
					expect(reason.errors[0]).to.not.equal(null);
				});
		});

		it('is called on papers containing a differing number of images', function (done) {
			let config = checkConfig;
			config.pathToOriginalHTML = testStringA;
			config.pathToReproducedHTML = testStringC;
			checker(config)
				.then(function (resolve) {
					},
					function (rejectMetadata) {
						expect(rejectMetadata.errors[0]).to.not.equal(null);
					})
				.then(done, done);

		})
	});

    describe.only('Returned Promise should be *resolved* and Metadata in reject statement should NOT contain Error message, when ERC-Checker', function () {
    	it("is called on two HTML files which contain text differences.", function (done) {
            this.timeout(0);

            let config = checkConfig;
            config.pathToOriginalHTML = testStringText1;
            config.pathToReproducedHTML = testStringText2;

            checker(config)
                .then(
                    function (metadata) {
                    	console.log(metadata.numTextDifferrences);
                        assert.equal(0, metadata.errors.length, "No errors should have been produced.");
                        assert.isAbove(metadata.numTextDifferrences, 0, "The number of textual differences should be larger than zero.");
                    }
                )
                .then(done);
		});
    });

	describe('Returned Promise object should be *resolved* and include a Metadata object, which ', function () {

		describe('for two equal input papers', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == true}, i.e. no differences found', function (done) {
				this.timeout(0);

				let config = checkConfig;
				config.pathToOriginalHTML = testStringA;
				config.pathToReproducedHTML = testStringA;

				checker(config)
					.then(
						function (metadata) {

							assert.isDefined(metadata, "No resolve metadata");

							assert.isTrue(metadata.checkSuccessful, "check should not have found differences, yet it did");
							assert.isUndefined(metadata.errors[0], "There should have been no errors, instead: " + JSON.stringify(metadata.errors));

						}
					)
					.then(
						function (result) {
							done(result);
						},
						function (reason) {
							done(reason);
						}
					);
			});
		});

		describe('for two differing papers containing 2 images each', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == false}, i.e. differences exist, plus an Array of image comparison results with a length 2', function (done) {
				this.timeout(0);

				let config = checkConfig;
				config.pathToOriginalHTML = testStringA;
				config.pathToReproducedHTML = testStringB;

				checker(config)
					.then(
						function (metadata) {

							assert.isFalse(metadata.checkSuccessful, "Paper contains differences, check should find them and be unsuccessful.".red);

							assert.isUndefined(metadata.errors[0], "Encountered Errors should be empty, but contained  at least: "+metadata.errors[0]+" and "+metadata.errors[1]+" and "+metadata.errors[2]);
							assert.strictEqual(metadata.errors.length, 0, "Encountered Errors should be empty, but contained "+metadata.errors.length+" errors.");
							assert.strictEqual(metadata.images.length, 2, "Paper contains 9 images, but only "+metadata.images.length+" were compared / featured in result object.");
							assert.isString(metadata.display.diff, "Resulting Diff HTML is not returned correctly (not a String)");

							assert.strictEqual(metadata.images[0].compareResults.differences, 0, "Image #1 is equal in both test papers, but differences were found.");
							assert.notStrictEqual(metadata.images[1].compareResults.differences, 0, "Images #2 in test papers are different, yet no differences were found.");

						}
					)
					.then(function (result) {
						done(result);
					}, function (reason) {
						done(reason);
					});
			});
		});

		describe('for two papers containing 9 of 9 differing images', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == false}, i.e. differences exist, plus an Array of image comparison results with a length of 9', function (done) {
				this.timeout(0);

				let config = checkConfig;
				config.pathToOriginalHTML = testStringD;
				config.pathToReproducedHTML = testStringC;
				config.saveMetadataJSON = false;

				checker(config)
					.then(
						function (metadata) {

							let i=1;
							for (let image of metadata.images) {
								assert.notStrictEqual(image.compareResults.differences, 0, "Image #"+i+" of 9 in test paper has differences, but were not found.");
								i++;
							}

							assert.isFalse(metadata.checkSuccessful, "Paper contains differences, check should find them and be unsuccessful.".red);

							assert.isUndefined(metadata.errors[0], "Encountered Errors should be empty, but contained  at least: "+metadata.errors[0]);
							assert.strictEqual(metadata.errors.length, 0, "Encountered Errors should be empty, but contained "+metadata.errors.length+" errors.");
							assert.strictEqual(metadata.images.length, 9, "Paper contains 9 images, but only "+metadata.images.length+" were compared / featured in result object.");
							assert.isString(metadata.display.diff, "Resulting Diff HTML is not returned correctly (not a String)");
						},
						function (reason) {
							done(new Error(reason));
						}
					).then(function (result) {
							done(result);
						}, function (reason) {
							done(reason);
						});

			});
		});

		describe('for a paper containing 9 images with only the first image differing', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == false}, i.e. differences exist, plus an Array of image comparison results with a length 9, of which only the first entry describes differences', function (done)
			 {
				this.timeout(0);

				 let config = checkConfig;
				 config.pathToOriginalHTML = testStringD;
				 config.pathToReproducedHTML = testStringE;
				 config.saveMetadataJSON = false;

				checker(config)
					.then(
						function (metadata) {

							metadata.images.map( function (current, index) {
								if (index == 0) {
									assert.notStrictEqual(current.compareResults.differences, 0, "First image has differences, but were not found.");
								}
								else {
									assert.strictEqual(current.compareResults.differences, 0, "Images are equal, but differences were found.");
								}
							});

							assert.isFalse(metadata.checkSuccessful, "Paper contains differences, check should find them and be unsuccessful.".red);

							assert.isUndefined(metadata.errors[0], "Encountered Errors should be empty, but contained  at least: "+metadata.errors[0]);
							assert.strictEqual(metadata.errors.length, 0, "Encountered Errors should be empty, but contained "+metadata.errors.length+" errors.");
							assert.strictEqual(metadata.images.length, 9, "Paper contains 9 images, but only "+metadata.images.length+" were compared / featured in result object.");
							assert.isString(metadata.display.diff, "Resulting Diff HTML is not returned correctly (not a String)");
						}
					)
					.then(
						function (result) {
							done(result);
						}, function (reason) {
							done(reason);
						}
					);
			});
		});
	});

	describe('With "saveMetadataJSON" flag set to "true", and "saveFilesOutputPath" given in the config object', function () {

		describe('for a check on two papers containing equal amount of, but differing images, and "createParentDirectories" flag set', function () {

			it('should successfully write a "metadata.json" file to the directory specified as Absolute Path', function (done) {
				this.timeout(0);
				let configSaveMeta = checkConfig;
				configSaveMeta.pathToOriginalHTML = testStringA;
				configSaveMeta.pathToReproducedHTML = testStringB;
				configSaveMeta.saveFilesOutputPath = "/tmp/erc-checker/test-saveMetadata";
				configSaveMeta.saveMetadataJSON = true;
				configSaveMeta.saveDiffHTML = true;
				configSaveMeta.createParentDirectories = true;

				checker(configSaveMeta)
					.then( function (resultMetadata) {
						let outputFileCreated = false;
						let errorReadingOutputFile = false;
						let jsonOutpath = path.join(configSaveMeta.saveFilesOutputPath, "metadata.json");
						let savedJSONFileContent;
						let resMeta = resultMetadata;

						try {
							fs.accessSync(jsonOutpath);
							outputFileCreated = true;
							savedJSONFileContent = JSON.parse(fs.readFileSync(jsonOutpath, 'utf-8'));
						}
						catch (e) {
							errorReadingOutputFile  = e;
						}

						assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: "+ resultMetadata.errors);

						assert.isTrue(outputFileCreated, "Error: Output file was not created or could not be read: " + errorReadingOutputFile);

						assert.deepEqual(resMeta, savedJSONFileContent, "Saved metadata.json file content varries from original check result metadata:");

						assert.isFalse(errorReadingOutputFile, "Error reading output file: "+ errorReadingOutputFile);
					})
					.then( function (success) {
						done();
					}, function (reason) {
						done(new Error(JSON.stringify(reason)));
					})
			})
        })
    });

    describe('With "saveDiffHTML" flag set to "true", and "saveFilesOutputPath" given in the config object', function () {

        describe('for a check on two papers containing equal amount of, but differing images, and "createParentDirectories" flag set', function () {

            it('should successfully write a "diffHTML.html" file to the directory specified as Absolute Path', function (done) {
                let configSaveMeta = checkConfig;
                configSaveMeta.pathToOriginalHTML = testStringA;
                configSaveMeta.pathToReproducedHTML = testStringB;
                configSaveMeta.saveFilesOutputPath = "/tmp/erc-checker/test-saveHTML";
                configSaveMeta.saveMetadataJSON = false;
                configSaveMeta.saveDiffHTML = true;
                configSaveMeta.createParentDirectories = true;

                checker(configSaveMeta)
                    .then(function (resultMetadata) {
                        let outputFileCreated = false;
                        let errorReadingOutputFile = false;
                        let htmlOutpath = path.join(configSaveMeta.saveFilesOutputPath, "diffHTML.html");

                        try {
                            fs.accessSync(htmlOutpath);
                            outputFileCreated = true;
                        }
                        catch (e) {
                            errorReadingOutputFile = e;
                        }

                        assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: " + resultMetadata.errors);

                        assert.isTrue(outputFileCreated, "Error: Output file was not created or could not be read: " + errorReadingOutputFile);

                        assert.isFalse(errorReadingOutputFile, "Error reading output file: " + errorReadingOutputFile);

                    })
                    .then(function (success) {
                        done();
                    }, function (reason) {
                        done(new Error(JSON.stringify(reason)));
                    })
            })
        });

        describe('for a check on two papers containing equal amount of, but differing images, a output file name passed in the config object, and "createParentDirectories" flag set', function () {
            it('should successfully write an HTML file with the specified name to the directory specified as Absolute Path', function (done) {
                let configSaveMeta = checkConfig;
                configSaveMeta.pathToOriginalHTML = testStringA;
                configSaveMeta.pathToReproducedHTML = testStringB;
                configSaveMeta.saveFilesOutputPath = "/tmp/erc-checker/test-saveHTML";
                configSaveMeta.saveMetadataJSON = false;
                configSaveMeta.saveDiffHTML = true;
                configSaveMeta.outFileName = "specifiedName.html";
                configSaveMeta.createParentDirectories = true;

                checker(configSaveMeta)
                    .then( function (resultMetadata) {
                        let outputFileCreated = false;
                        let errorReadingOutputFile = false;
                        let htmlOutpath = path.join(configSaveMeta.saveFilesOutputPath, "specifiedName.html");
                        let resMeta = resultMetadata;

                        try {
                            fs.accessSync(htmlOutpath);
                            outputFileCreated = true;
                        }
                        catch (e) {
                            errorReadingOutputFile  = e;
                        }

                        assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: "+ resultMetadata.errors);

                        assert.isTrue(outputFileCreated, "Error: Output file was not created or could not be read: " + errorReadingOutputFile);

                        assert.isFalse(errorReadingOutputFile, "Error reading output file: "+ errorReadingOutputFile);

                    })
                    .then( function (success) {
                        done();
                    }, function (reason) {
                        done(new Error(JSON.stringify(reason)));
                    })
            })
        })
    });


    describe("Running the erc-checker in directory mode for a paper with 2 images each, one of which differing" , function () {
		it("should work just as well as in file mode (see above)", function (done) {
			this.timeout(0);

			let config = checkConfig;
			config.directoryMode = true;
			config.pathToMainDirectory = testStringDirMode;
			checker(config)
				.then(function (resultMetadata) {
					let metadata = resultMetadata;
					assert.isFalse(metadata.checkSuccessful, "Paper contains differences, check should find them and be unsuccessful.".red);

					assert.isUndefined(metadata.errors[0], "Encountered Errors should be empty, but contained  at least: "+metadata.errors[0]+" and "+metadata.errors[1]+" and "+metadata.errors[2]);
					assert.strictEqual(metadata.errors.length, 0, "Encountered Errors should be empty, but contained "+metadata.errors.length+" errors.");
					assert.strictEqual(metadata.images.length, 2, "Paper contains 9 images, but only "+metadata.images.length+" were compared / featured in result object.");
					assert.isString(metadata.display.diff, "Resulting Diff HTML is not returned correctly (not a String)");

					assert.strictEqual(metadata.images[0].compareResults.differences, 0, "Image #1 is equal in both test papers, but differences were found.");
					assert.notStrictEqual(metadata.images[1].compareResults.differences, 0, "Images #2 in test papers are different, yet no differences were found.");
				}, function (reason) {
					return Promise.reject(reason);
				})
				.then(function (success) {
					done();
				},
				function (reason) {
					done(new Error(JSON.stringify(reason)));
				})
		})
	});

    describe("Running the erc-checker in an environment with a `.ercignore` file and/or with acceptable file endings specified in `config` object", function () {
        describe("the checker should create a ComparisonSet list of files to be checked, which", function () {

            it("should only contain files, which have the required file ending.", function (done) {
            	this.timeout(0);

                let configTestIgnore = checkConfig;
                configTestIgnore.pathToOriginalHTML = testStringA;
                configTestIgnore.pathToReproducedHTML = testStringB;
                configTestIgnore.comparisonSetBaseDir = "./test/test_ercignore";
                configTestIgnore.checkFileTypes = ['html','htm','mp3'];

                checker(configTestIgnore)
                    .then(function (resultMetadata) {

                        let allFilesCorrect = true;
                        resultMetadata.comparisonSet.forEach(filePath => {
                        	let endingHTM = (filePath.substr(filePath.length-4, 4)) == ".htm";
                        	let endingHTML = (filePath.substr(filePath.length-5, 5)) == ".html";
                        	let endingMP3 = (filePath.substr(filePath.length-4, 4)) == ".mp3";

                        	if (!endingHTM && !endingHTML && !endingMP3) {
                        		allFilesCorrect = false;
							}
						});
                        assert.strictEqual(allFilesCorrect, true, "ComparisonSet contains files which do not match the required file endings: \n"+ resultMetadata.comparisonSet);

                        assert.strictEqual(resultMetadata.comparisonSet.length, 7, "ComparisonSet should include 7 file paths, but it contained "+ resultMetadata.comparisonSet.length);

                        assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: "+ resultMetadata.errors);

                    }, function (reason) {
						return Promise.reject(reason);
                    })
                    .then( function (success) {
                        done();
                    }, function (reason) {
                        done(new Error(JSON.stringify(reason)));
                    })
            });

            it("should by default only contain files having a \".htm\" or \".html\" ending.", function (done) {
                let configTestIgnore = checkConfig;
                configTestIgnore.pathToOriginalHTML = testStringA;
                configTestIgnore.pathToReproducedHTML = testStringB;
                configTestIgnore.comparisonSetBaseDir = "./test/test_ercignore";
                delete configTestIgnore.checkFileTypes;

                checker(configTestIgnore)
                    .then( function (resultMetadata) {

                        let allFilesCorrect = true;
                        resultMetadata.comparisonSet.forEach(filePath => {
                            let endingHTM = (filePath.substr(filePath.length-4, 4)) == ".htm";
                            let endingHTML = (filePath.substr(filePath.length-5, 5)) == ".html";

                            if (!endingHTM && !endingHTML) {
                                allFilesCorrect = false;
                            }
                        });
                        assert.strictEqual(allFilesCorrect, true, "ComparisonSet contains files which do not match the required file endings: \n"+ resultMetadata.comparisonSet);

                        assert.strictEqual(resultMetadata.comparisonSet.length, 6, "ComparisonSet should include 6 file paths, but it contained "+ resultMetadata.comparisonSet.length);

                        assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: "+ resultMetadata.errors);
                    })
                    .then( function (success) {
                        done();
                    }, function (reason) {
                        done(new Error(JSON.stringify(reason)));
                    })
            });

            it("should only contain files which are not ignored by `.ercignore`", function (done) {
                let configTestIgnore = checkConfig;
                configTestIgnore.pathToOriginalHTML = testStringA;
                configTestIgnore.pathToReproducedHTML = testStringB;
                configTestIgnore.comparisonSetBaseDir = "./test/test_ercignore";
                configTestIgnore.checkFileTypes = [".*"];

                checker(configTestIgnore)
                    .then(function (resultMetadata) {

                        let allFilesCorrect = true;
                        resultMetadata.comparisonSet.forEach(filePath => {
                            let containsFilteredDirectory = (filePath.includes("false_positive_dir/"));
                            let endingPNG = (filePath.substr(filePath.length-4, 4)) == ".png";

                            if (containsFilteredDirectory || endingPNG) {
                                allFilesCorrect = false;
                            }
                        });
                        assert.strictEqual(allFilesCorrect, true, "ComparisonSet contains files which do not match the required file endings: \n"+ resultMetadata.comparisonSet);

                        assert.strictEqual(resultMetadata.comparisonSet.length, 8, "ComparisonSet should include 8 file paths, but it contained "+ resultMetadata.comparisonSet.length);

                        assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: "+ resultMetadata.errors);
                    })
                    .then( function (success) {
                        done();
                    }, function (reason) {
                        done(new Error(JSON.stringify(reason)));
                    })
            });

            it("should only contain files, which have the required file ending, and are not filtered by the `.ercignore` file.", function (done) {
                let configTestIgnore = checkConfig;
                configTestIgnore.pathToOriginalHTML = testStringA;
                configTestIgnore.pathToReproducedHTML = testStringB;
                configTestIgnore.comparisonSetBaseDir = "./test/test_ercignore";
                configTestIgnore.checkFileTypes = ["html", "htm"];

                checker(configTestIgnore)
                    .then(function (resultMetadata) {
                        let allFilesCorrect = true;
                        resultMetadata.comparisonSet.forEach(filePath => {
                            let containsFilteredDirectory = (filePath.includes("false_positive_dir/"));
                            let endingPNG = (filePath.substr(filePath.length-4, 4)) == ".png";

                            let endingHTM = (filePath.substr(filePath.length-4, 4)) == ".htm";
                            let endingHTML = (filePath.substr(filePath.length-5, 5)) == ".html";

                            if (containsFilteredDirectory || endingPNG) {
                                allFilesCorrect = false;
                            }
                            if (!endingHTM && !endingHTML) {
                            	allFilesCorrect = false;
							}
                        });
                        assert.strictEqual(allFilesCorrect, true, "ComparisonSet contains files which do not match the required file endings: \n"+ resultMetadata.comparisonSet);

                        assert.strictEqual(resultMetadata.comparisonSet.length, 6, "ComparisonSet should include 6 file paths, but it contained "+ resultMetadata.comparisonSet.length);

                        assert.strictEqual(resultMetadata.errors.length, 0, "Check should not have produced Errors, yet it did: "+ resultMetadata.errors);
                    })
                    .then( function (success) {
                        done();
                    }, function (reason) {
                        done(new Error(JSON.stringify(reason)));
                    })
            });
        });
    });

    // describe("Running the erc-checker on ")

	describe.skip("After successful Test execution", function () {
		it("deletes temporary leftovers", function () {
			let cleanUpWentWrong = false;
			try {
				deleteFolderRecursive("/tmp/erc-checker/test-saveMetadata");
				deleteFolderRecursive("/tmp/erc-checker/test-saveHTML");
			} catch (e) {
				cleanUpWentWrong = e;
			}
			expect(cleanUpWentWrong).to.equal(false);
			assert.isFalse(cleanUpWentWrong, cleanUpWentWrong);

			assert.isFalse(fs.existsSync("/tmp/erc-checker/test-saveMetadata"), "CleanUp went wrong, path still exists.");
			assert.isFalse(fs.existsSync("/tmp/erc-checker/test-saveHTML"), "CleanUp went wrong, path still exists.");
		});
	});
});

var deleteFolderRecursive = function(pathParam) {
	let tmpDirPath = pathParam;

	fs.readdirSync(tmpDirPath).forEach(function(file, index){
		let curPath = path.join(tmpDirPath, file);
		if(fs.lstatSync(curPath).isDirectory()) { // recurse
			deleteFolderRecursive(curPath);
		} else { // delete file
			fs.unlinkSync(curPath);
		}
	});
	fs.rmdirSync(tmpDirPath);
};