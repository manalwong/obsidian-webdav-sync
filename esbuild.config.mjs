import esbuild from 'esbuild'
import fs, { readFileSync } from 'fs'
import process from 'process'

const pkgJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

const prod = process.argv[2] === 'production'

const context = await esbuild.context({
	entryPoints: ['src/index.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
	],
	alias: {
		'webdav-explorer': './src/stubs/webdav-explorer.ts',
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(prod ? 'production' : 'development'),
		'process.env.PLUGIN_VERSION': JSON.stringify(pkgJson.version),
	},
	format: 'cjs',
	target: 'es2018',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: false,
	outfile: prod ? 'dist/main.js' : 'main.js',
	minify: prod,
	platform: 'node',
	mainFields: ['module', 'main'],
	conditions: ['node', 'browser', 'import', 'default'],
	loader: {
		'.js': 'jsx',
	},
	plugins: [],
})

if (prod) {
	await context.rebuild()
	process.exit(0)
} else {
	await context.watch()
}
