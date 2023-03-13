const { default: axios } = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const pageURLs = [
	'https://www.understandingwar.org/backgrounder/ukraine-conflict-updates-2022',
	'https://www.understandingwar.org/backgrounder/ukraine-conflict-updates',
]

async function extractReportURLs(sourceURLs) {
	const resArr = [];

	await Promise.all(sourceURLs.map(async (url) => {
		const docRes = await axios.get(url)
		const $ = cheerio.load(docRes.data)
		const pageAnchors = $('a').toArray()

		const filteredAnchors = pageAnchors.reduce((filtered, anchor) => {
			if (
				$(anchor).text().startsWith('Russian Offensive Campaign Assessment')
			) {
				filtered.push($(anchor).attr('href'));
			}
			return filtered
		}, [])
		resArr.push(...filteredAnchors);
	}))

	return resArr;
}

function filterContent(content) {
	return content
		.replace(/(\[\d*\])/g, "")
		.replace(/(http.*)/g, "")
		.replace(/(Click here.*?\.)/g, "")
		.replace(/(Satellite image ©2022 Maxar Technologies[.]?)/g, "")
		.replace(/\n/g, "")
		.trim();
}

async function processReport(url) {
	const docRes = await axios.get(url)
	const $ = cheerio.load(docRes.data)

	const rawDate = $("span[property='dc:date dc:created']").attr('content')
	let rawContent = $('.field-name-body').text();
	rawContent = rawContent.split('\n').slice(2).join()
	const processedContent = filterContent(rawContent);

	console.log(`Report for date ${new Date(rawDate).toDateString()} processed; (${url})`)
	if (!rawDate) return undefined;
	return {
		// url: url,
		date: new Date(rawDate),
		content: processedContent
	}
}

async function main() {
	const reports = []
	const reportURLs = await extractReportURLs(pageURLs);

	await Promise.all(reportURLs.map(async (reportURL) => {
		const processedReport = await processReport(reportURL);
		reports.push(processedReport)
	}))

	console.log(reports.length)

	reports.sort((rep1, rep2) => {
		return rep1.date - rep2.date
	})

	fs.writeFile('reports.json', JSON.stringify(reports, null, 4), err => {
		if (err) {
			console.error(err);
		}
	})
}

main();