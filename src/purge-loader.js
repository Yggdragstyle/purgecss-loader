const path = require('path')
const validateOptions = require('schema-utils')
const { getOptions } = require('loader-utils')
const { existsSync, lstatSync, readFileSync } = require('fs')
const { PurgeCSS } = require('purgecss')

const schema = {
  type: 'object',
  properties: {
    content: {
      description: 'HTML / Twig / Handlebars etc.',
      type: ['array'],
    },
    defaultExtractor: {
      description: 'Use a default custom extractor',
      instanceof: 'Function',
    },
    extractors: {
      description: 'Use a custom extractor by type/extension of file',
      type: ['array'],
    },
    whitelist: {
      description: 'Whitelist to allow css selectors',
      type: ['array'],
    },
    whitelistPatterns: {
      description: 'Whitelist patern to allow css selectors',
      type: ['array'],
    },
    whitelistPatternsChildren: {
      description: 'Whitelist patern of childrens to allow css selectors',
      type: ['array'],
    },
    fontFace: {
      description: 'Remove any unused @font-face rules in your css',
      type: 'boolean',
    },
    keyframes: {
      description: 'Remove any unused keyframes in your css',
      type: 'boolean',
    },
    variables: {
      description: 'Remove any unused variables in your css',
      type: 'boolean',
    },
    rejected: {
      description: `It can sometimes be more practical to scan through the removed list to see if there's anything obviously wrong`,
      type: 'boolean',
    },
  },
}

function getRawContent(filepath) {
  let extension, raw

  try {
    extension = filepath.match(/\.\w+$/)[0]
  } catch (err) {
    throw new Error(`Undefined extension of "${filepath}" with error: ${err}`)
  }

  try {
    raw = readFileSync(filepath, 'utf8')
  } catch (err) {
    throw new Error(`Impossible to read the content of "${filepath}" with error: ${err}`)
  }

  return {
    extension,
    raw,
  }
}

function validateFilePath(filepath) {
  if (false === existsSync(filepath)) {
    throw new Error(`File in "${filepath}" doesn't exist`)
  }

  if (false === lstatSync(filepath).isFile()) {
    throw new Error(`"${filepath}" is not a file`)
  }
}

module.exports = function (raw) {
  // Get and Validate options
  const options = getOptions(this)
  validateOptions(schema, options, 'Example Loader')

  let { content, ...opts } = options
  const css = [{ ext: 'css', raw }]

  if (content.length < 1) throw new Error(`You must provide a content file to analyse for PurgeCSS`)

  // Make loader asynchrone
  const callback = this.async()

  // Process on the content HTML
  content = content.map((filepath) => {
    // Resole file path
    filepath = path.resolve(filepath)

    // Validate it is a existing file
    validateFilePath(filepath)

    // Track dependencies (important for watching)
    this.addDependency(filepath)

    // return raw of content
    return getRawContent(filepath)
  })

  // Purge CSS
  return new PurgeCSS()
    .purge({
      content,
      css,
      ...opts,
    })
    .then((result) => {
      result = result[0].css
      callback(null, result)
    })
    .catch((err) => {
      console.error('Purge echec with err:', err)
    })
}
