"use strict";
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const yargs = require("yargs");
const watchman = require("fb-watchman");
const chalk = require("chalk");
const sass = chalk.green("sass");
const tcm = chalk.green("tcm");
function compileSassFiles(args) {
  const {
    recursive,
    watch,
    namedExports,
    asIs,
    camelCase,
    camelCaseOnly,
    dashes,
    dashesOnly,
    loadPath,
    noCharset,
    errorCss,
    //update, style, stdin, indented, poll, quiet, trace,
    noSourceMap,
    sourceMapUrls,
    embedSources,
    embedSourceMap,
    stopOnError,
    noUnicode,
    quietDeps,
    fatalDeprecation,
    deleteCss,
    "delete-css": ds,
    //@ts-ignore
    _: folder,
    ...a
  } = args;
  const sassFiles = findSassFiles(folder, recursive);
  console.log("compileSassFiles", folder, console.log(JSON.stringify(args)));
  sassFiles.forEach((sassFile) => {
    const cssFile = convertSassToCss(sassFile);
    try {
      compileSass(
        sassFile,
        cssFile,
        a
        // {
        // stdin,
        // indented,
        // loadPath,
        // style,
        // noCharset,
        // errorCss,
        // update,
        // noSourceMap,
        // sourceMapUrls,
        // embedSources,
        // embedSourceMap,
        // poll,
        // stopOnError,
        // noUnicode,
        // quiet,
        // quietDeps,
        // fatalDeprecation,
        // trace,
        // }
      );
      generateTypedCssModules(cssFile, {
        namedExports,
        asIs,
        camelCase,
        camelCaseOnly,
        dashes,
        dashesOnly
      }, deleteCss);
    } catch (error) {
      console.error(`Error compiling ${sass} file ${sassFile}:`, error);
    } finally {
      if (deleteCss)
        deleteFile(cssFile);
    }
  });
  if (watch) {
    const client = new watchman.Client();
    const watchDir = path.resolve(process.cwd(), folder);
    client.command(["watch-project", watchDir], (error, resp) => {
      if (error) {
        console.error("Error setting up watchman:", error);
        return;
      }
      if ("warning" in resp) {
        console.log("Warning from watchman:", resp.warning);
      }
      const { watch: watchPath } = resp;
      const subscription = {
        expression: ["allof", ["match", "*.module.scss"]],
        fields: ["name"]
      };
      client.command(["subscribe", watchPath, "sass-watch", subscription], (error2, resp2) => {
        if (error2) {
          console.error("Error subscribing to watchman:", error2);
          return;
        }
        console.log("Watching for changes in Sass files...");
      });
      client.on("subscription", (resp2) => {
        if (resp2.subscription !== "sass-watch") {
          return;
        }
        resp2.files.forEach((file) => {
          const sassFile = path.resolve(watchPath, file.name);
          const cssFile = convertSassToCss(sassFile);
          try {
            compileSass(
              sassFile,
              cssFile,
              a
              // {
              //     stdin,
              //     indented,
              //     loadPath,
              //     style,
              //     noCharset,
              //     errorCss,
              //     update,
              //     noSourceMap,
              //     sourceMapUrls,
              //     embedSources,
              //     embedSourceMap,
              //     poll,
              //     stopOnError,
              //     noUnicode,
              //     quiet,
              //     quietDeps,
              //     fatalDeprecation,
              //     trace,
              // }
            );
            generateTypedCssModules(cssFile, {
              namedExports,
              asIs,
              camelCase,
              camelCaseOnly,
              dashes,
              dashesOnly
            }, deleteCss);
          } catch (error2) {
            console.error(`Error compiling ${sass} file ${sassFile}:`, error2);
          } finally {
            if (deleteCss)
              deleteFile(cssFile);
          }
        });
      });
    });
  }
}
function findSassFiles(folder, recursive) {
  const globPattern = recursive ? `${folder}/**/*.module.{scss,sass}` : `${folder}/*.module.{scss,sass}`;
  return glob.sync(globPattern);
}
function convertSassToCss(sassFile) {
  const cssFile = sassFile.replace(/\.module\.(scss|sass)$/, ".module.css");
  return cssFile;
}
function checkSass() {
  const sassCommand = `sass --version`;
  let res;
  try {
    res = child_process.execSync(sassCommand, { stdio: "inherit" });
    return true;
  } catch (ex) {
    console.error(chalk.red("Sass execution error"));
    console.error(chalk.red("Please install sass globally"));
    return false;
  }
}
function checkTcm() {
  const sassCommand = `tcm --version`;
  let res;
  try {
    res = child_process.execSync(sassCommand, { stdio: "inherit" });
    return true;
  } catch (ex) {
    console.error(chalk.red("typed-css-modules execution error"));
    console.error(chalk.red("Please install typed-css-modules globally"));
    return false;
  }
}
function compileSass(sassFile, cssFile, sassOptions) {
  const sassCommand = `sass ${sassFile} ${cssFile} ${formatSassOptions(sassOptions)}`;
  console.log(`${sass} ${sassFile} ${cssFile} ${formatSassOptions(sassOptions)}`);
  child_process.execSync(sassCommand, { stdio: "inherit" });
}
function formatSassOptions(sassOptions) {
  const options = [];
  for (const [key, value] of Object.entries(sassOptions)) {
    if (typeof value === "boolean" && value) {
      options.push(`--${key}`);
    } else if (Array.isArray(value)) {
      value.forEach((val) => {
        options.push(`--${key} ${val}`);
      });
    }
  }
  return options.join(" ");
}
function generateTypedCssModules(cssFile, cssModulesOptions, deleteCss) {
  const typedCssModulesCommand = `tcm ${cssFile} ${formatTypedCssModulesOptions(cssModulesOptions)}`;
  console.log(`${tcm} ${cssFile} ${formatTypedCssModulesOptions(cssModulesOptions)}`, !deleteCss ? "\n" : "");
  child_process.execSync(typedCssModulesCommand, { stdio: "inherit" });
}
function formatTypedCssModulesOptions(cssModulesOptions) {
  const options = [];
  for (const [key, value] of Object.entries(cssModulesOptions)) {
    if (typeof value === "boolean" && value) {
      options.push(`--${key}`);
    }
  }
  return options.join(" ");
}
function deleteFile(file) {
  console.log(chalk.green("Deleting..."), file, "\n");
  fs.unlinkSync(file);
  fs.unlinkSync(file + ".map");
}
const argv = yargs.strict(false).positional("folder", {
  describe: "Folder containing Sass files",
  type: "string",
  demandOption: true
}).option("recursive", {
  alias: "r",
  describe: "Search for Sass files recursively",
  type: "boolean",
  default: false
}).option("watch", {
  alias: "w",
  describe: "Enable watch mode",
  type: "boolean",
  default: false
}).option("namedExports", {
  alias: "e",
  describe: "Export types as named exports",
  type: "boolean",
  default: false
}).option("asIs", {
  describe: "Export class names as is",
  type: "boolean",
  default: false
}).option("camelCase", {
  alias: "c",
  describe: "Camelize class names",
  type: "boolean",
  default: false
}).option("camelCaseOnly", {
  alias: "cc",
  describe: "Camelize class names and remove original class names from locals",
  type: "boolean",
  default: false
}).option("dashes", {
  alias: "d",
  describe: "Camelize only dashes in class names",
  type: "boolean",
  default: false
}).option("dashesOnly", {
  alias: "do",
  describe: "Camelize only dashes in class names and remove original class names from locals",
  type: "boolean",
  default: false
}).option("stdin", {
  describe: "Read input file from standard input",
  type: "boolean",
  default: false
}).option("indented", {
  describe: "Parse input file as indented syntax",
  type: "boolean",
  default: false
}).option("loadPath", {
  alias: "l",
  describe: "Additional load paths for Sass to look for stylesheets",
  type: "array",
  default: []
}).option("style", {
  alias: "s",
  describe: "Output style of the resulting CSS",
  choices: ["expanded", "compressed"],
  default: "expanded"
}).option("noCharset", {
  describe: "Do not emit a @charset declaration or a UTF-8 byte-order mark",
  type: "boolean",
  default: false
}).option("errorCss", {
  describe: "Emit a CSS file when an error occurs during compilation",
  type: "boolean",
  default: false
}).option("deleteCss", {
  describe: "Delete intermediate a CSS during processing",
  type: "boolean",
  default: false
}).option("update", {
  describe: "Only compile stylesheets with modified dependencies",
  type: "boolean",
  default: false
}).option("noSourceMap", {
  describe: "Do not generate any source maps",
  type: "boolean",
  default: false
}).option("sourceMapUrls", {
  describe: "Type of URLs in source maps",
  choices: ["relative", "absolute"],
  default: "relative"
}).option("embedSources", {
  describe: "Embed the entire contents of the Sass files in the source map",
  type: "boolean",
  default: false
}).option("embedSourceMap", {
  describe: "Embed the contents of the source map file in the generated CSS",
  type: "boolean",
  default: false
}).option("poll", {
  describe: "Manually check for changes to the source files at regular intervals",
  type: "boolean",
  default: false
}).option("stopOnError", {
  describe: "Stop compiling immediately when an error is detected",
  type: "boolean",
  default: false
}).option("noUnicode", {
  describe: "Emit ASCII characters only in error messages",
  type: "boolean",
  default: false
}).option("quiet", {
  alias: "q",
  describe: "Silence warnings and status messages during compilation",
  type: "boolean",
  default: false
}).option("quietDeps", {
  describe: "Silence warnings for all dependencies during compilation",
  type: "boolean",
  default: false
}).option("fatalDeprecation", {
  describe: "Treat deprecations as errors for the specified deprecations",
  type: "array",
  default: []
}).option("trace", {
  describe: "Show a full Ruby stack trace on error",
  type: "boolean",
  default: false
}).argv;
if (checkSass() && checkTcm())
  compileSassFiles(argv);
//# sourceMappingURL=index.js.map
