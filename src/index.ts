import { execSync } from 'child_process'
import { unlinkSync } from 'fs'
import { resolve, extname } from 'path'
import * as glob from 'glob'
import _yargs from 'yargs'
import watchman from 'fb-watchman'
import chalk from 'chalk'
import { hideBin } from 'yargs/helpers'

const yargs = _yargs(hideBin(process.argv));

interface Args {
    folder: string
    recursive: boolean
    watch: boolean
    namedExports: boolean
    asIs: boolean
    camelCase: boolean
    camelCaseOnly: boolean
    dashes: boolean
    dashesOnly: boolean
    stdin: boolean
    indented: boolean
    loadPath: string[]
    style: 'expanded' | 'compressed'
    noCharset: boolean
    errorCss: boolean
    update: boolean
    noSourceMap: boolean
    sourceMapUrls: 'relative' | 'absolute'
    embedSources: boolean
    embedSourceMap: boolean
    poll: boolean
    stopOnError: boolean
    noUnicode: boolean
    quiet: boolean
    quietDeps: boolean
    fatalDeprecation: string[]
    trace: boolean
    deleteCss: boolean
    "delete-css": boolean
}

const sass = chalk.green('sass')
const tcm = chalk.green('tcm')

function compileSassFiles(args: Args) {
    const { recursive, watch, namedExports, asIs, camelCase, camelCaseOnly, dashes, dashesOnly, loadPath, noCharset, errorCss,
        //update, style, stdin, indented, poll, quiet, trace,
        noSourceMap, sourceMapUrls, embedSources, embedSourceMap, stopOnError, noUnicode, quietDeps, fatalDeprecation, deleteCss, "delete-css": ds,
        //@ts-ignore
        _: folder,
        ...a } = args

    const sassFiles = findSassFiles(folder, recursive)
    // console.log("compileSassFiles", folder, console.log(JSON.stringify(args)))
    // return

    sassFiles.forEach((sassFile) => {
        const cssFile = convertSassToCss(sassFile)

        try {
            compileSass(sassFile, cssFile, a
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
            )
            generateTypedCssModules(cssFile, {
                namedExports,
                asIs,
                camelCase,
                camelCaseOnly,
                dashes,
                dashesOnly,
            }, deleteCss)
        } catch (error) {
            console.error(`Error compiling ${sass} file ${sassFile}:`, error)
        } finally {
            if (deleteCss)
                deleteFile(cssFile)
        }
    })

    if (watch) {
        const client = new watchman.Client()
        const watchDir = resolve(process.cwd(), folder)

        client.command(['watch-project', watchDir], (error, resp) => {
            if (error) {
                console.error('Error setting up watchman:', error)
                return
            }

            if ('warning' in resp) {
                console.log('Warning from watchman:', resp.warning)
            }

            const { watch: watchPath } = resp
            const subscription = {
                expression: ['allof', ['match', '*.module.scss']],
                fields: ['name'],
            }

            client.command(['subscribe', watchPath, 'sass-watch', subscription], (error, resp) => {
                if (error) {
                    console.error('Error subscribing to watchman:', error)
                    return
                }

                console.log('Watching for changes in Sass files...')
            })

            client.on('subscription', (resp) => {
                if (resp.subscription !== 'sass-watch') {
                    return
                }

                resp.files.forEach((file) => {
                    const sassFile = resolve(watchPath, file.name)
                    const cssFile = convertSassToCss(sassFile)

                    try {
                        compileSass(sassFile, cssFile, a
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
                        )
                        generateTypedCssModules(cssFile, {
                            namedExports,
                            asIs,
                            camelCase,
                            camelCaseOnly,
                            dashes,
                            dashesOnly,
                        }, deleteCss)
                    } catch (error) {
                        console.error(`Error compiling ${sass} file ${sassFile}:`, error)
                    } finally {
                        if (deleteCss)
                            deleteFile(cssFile)
                    }
                })
            })
        })
    }
}

function findSassFiles(folder: string, recursive: boolean): string[] {
    const globPattern = recursive ? `${folder}/**/*.module.{scss,sass}` : `${folder}/*.module.{scss,sass}`
    return glob.sync(globPattern)
}

function convertSassToCss(sassFile: string): string {
    const cssFile = sassFile.replace(/\.module\.(scss|sass)$/, '.module.css')
    return cssFile
}

function checkSass() {
    const sassCommand = `sass --version`
    let res: string
    try {
        console.log('Sass version:')
        res = execSync(sassCommand, { stdio: 'inherit' })
        return true
    }
    catch (ex) {
        // console.log(ex)
        console.error(chalk.red('Sass execution error'))
        console.error(chalk.red('Please install sass globally'))
        return false
    }
}

function checkTcm() {
    const sassCommand = `tcm --version`
    let res: string
    try {
        console.log('typed-css-modules version:')
        res = execSync(sassCommand, { stdio: 'inherit' })
        return true
    }
    catch (ex) {
        // console.log(ex)
        console.error(chalk.red('typed-css-modules execution error'))
        console.error(chalk.red('Please install typed-css-modules globally'))
        return false
    }
}


function compileSass(sassFile: string, cssFile: string, sassOptions: Record<string, unknown>) {
    const sassCommand = `sass ${sassFile} ${cssFile} ${formatSassOptions(sassOptions)}`
    console.log(`${sass} ${sassFile} ${cssFile} ${formatSassOptions(sassOptions)}`)

    execSync(sassCommand, { stdio: 'inherit' })
}

function formatSassOptions(sassOptions: Record<string, unknown>): string {
    const options = []

    for (const [key, value] of Object.entries(sassOptions)) {
        if (typeof value === 'boolean' && value) {
            options.push(`--${key}`)
            // } else if (value === false) {
            //     options.push(`--no-${key}`)
        } else if (Array.isArray(value)) {
            value.forEach((val) => {
                options.push(`--${key} ${val}`)
            })
        }
        // else {
        //     options.push(`--${key} ${value}`)
        // }
    }

    return options.join(' ')
}

function generateTypedCssModules(cssFile: string, cssModulesOptions: Record<string, unknown>, deleteCss: boolean) {
    const typedCssModulesCommand = `tcm ${cssFile} ${formatTypedCssModulesOptions(cssModulesOptions)}`
    console.log(`${tcm} ${cssFile} ${formatTypedCssModulesOptions(cssModulesOptions)}`, !deleteCss ? '\n' : '')
    execSync(typedCssModulesCommand, { stdio: 'inherit' })
}

function formatTypedCssModulesOptions(cssModulesOptions: Record<string, unknown>): string {
    const options: string[] = []

    for (const [key, value] of Object.entries(cssModulesOptions)) {
        if (typeof value === 'boolean' && value) {
            options.push(`--${key}`)
        }
        // else if (value === false) {
        //     options.push(`--no-${key}`)
        // }
    }

    return options.join(' ')
}

function deleteFile(file: string) {
    console.log(chalk.green("Deleting..."), file, '\n')
    unlinkSync(file)
    unlinkSync(file + '.map')
}

const argv = yargs
    .strict(false)
    .positional('folder', {
        describe: 'Folder containing Sass files',
        type: 'string',
        demandOption: true,
    })
    .option('recursive', {
        alias: 'r',
        describe: 'Search for Sass files recursively',
        type: 'boolean',
        default: false,
    })
    .option('watch', {
        alias: 'w',
        describe: 'Enable watch mode',
        type: 'boolean',
        default: false,
    })
    .option('namedExports', {
        alias: 'e',
        describe: 'Export types as named exports',
        type: 'boolean',
        default: false,
    })
    .option('asIs', {
        describe: 'Export class names as is',
        type: 'boolean',
        default: false,
    })
    .option('camelCase', {
        alias: 'c',
        describe: 'Camelize class names',
        type: 'boolean',
        default: false,
    })
    .option('camelCaseOnly', {
        alias: 'cc',
        describe: 'Camelize class names and remove original class names from locals',
        type: 'boolean',
        default: false,
    })
    .option('dashes', {
        alias: 'd',
        describe: 'Camelize only dashes in class names',
        type: 'boolean',
        default: false,
    })
    .option('dashesOnly', {
        alias: 'do',
        describe: 'Camelize only dashes in class names and remove original class names from locals',
        type: 'boolean',
        default: false,
    })
    .option('stdin', {
        describe: 'Read input file from standard input',
        type: 'boolean',
        default: false,
    })
    .option('indented', {
        describe: 'Parse input file as indented syntax',
        type: 'boolean',
        default: false,
    })
    .option('loadPath', {
        alias: 'l',
        describe: 'Additional load paths for Sass to look for stylesheets',
        type: 'array',
        default: [],
    })
    .option('style', {
        alias: 's',
        describe: 'Output style of the resulting CSS',
        choices: ['expanded', 'compressed'],
        default: 'expanded',
    })
    .option('noCharset', {
        describe: 'Do not emit a @charset declaration or a UTF-8 byte-order mark',
        type: 'boolean',
        default: false,
    })
    .option('errorCss', {
        describe: 'Emit a CSS file when an error occurs during compilation',
        type: 'boolean',
        default: false,
    })
    .option('deleteCss', {
        describe: 'Delete intermediate a CSS during processing',
        type: 'boolean',
        default: false,
    })
    .option('update', {
        describe: 'Only compile stylesheets with modified dependencies',
        type: 'boolean',
        default: false,
    })
    .option('noSourceMap', {
        describe: 'Do not generate any source maps',
        type: 'boolean',
        default: false,
    })
    .option('sourceMapUrls', {
        describe: 'Type of URLs in source maps',
        choices: ['relative', 'absolute'],
        default: 'relative',
    })
    .option('embedSources', {
        describe: 'Embed the entire contents of the Sass files in the source map',
        type: 'boolean',
        default: false,
    })
    .option('embedSourceMap', {
        describe: 'Embed the contents of the source map file in the generated CSS',
        type: 'boolean',
        default: false,
    })
    .option('poll', {
        describe: 'Manually check for changes to the source files at regular intervals',
        type: 'boolean',
        default: false,
    })
    .option('stopOnError', {
        describe: 'Stop compiling immediately when an error is detected',
        type: 'boolean',
        default: false,
    })
    .option('noUnicode', {
        describe: 'Emit ASCII characters only in error messages',
        type: 'boolean',
        default: false,
    })
    .option('quiet', {
        alias: 'q',
        describe: 'Silence warnings and status messages during compilation',
        type: 'boolean',
        default: false,
    })
    .option('quietDeps', {
        describe: 'Silence warnings for all dependencies during compilation',
        type: 'boolean',
        default: false,
    })
    .option('fatalDeprecation', {
        describe: 'Treat deprecations as errors for the specified deprecations',
        type: 'array',
        default: [],
    })
    .option('trace', {
        describe: 'Show a full Ruby stack trace on error',
        type: 'boolean',
        default: false,
    })
    .argv

if (checkSass() && checkTcm())
    compileSassFiles(argv)
