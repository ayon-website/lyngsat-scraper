const puppeteer						= require('puppeteer');	 

const { colors, format }	= require('./ansi');
const satScrape						= require('./sat-scrape');
const satLaunchesScrape		= require('./satLaunch-scrape');
const satChannelsScrape		= require('./satChannel-scrape'); 
const { regions, url } 		= require('./config');
const fs 									= require('fs');
const { joinJSON }				= require('./utils');
const connectAndInsertData = require('./db_connect');

const main = async () => {

  const args = process.argv.slice(2);

	fs.writeFileSync('./satChannelData.json', '[\n]');	

	// write to db 
	if (args.includes('-db') || args.includes('--write-to-db')) {
		console.log(colors.green + 'InsertingDB' + colors.reset);
		connectAndInsertData();
		return;
	}

	if ( args.includes('-h') || args.includes('--help') ) {
		console.log(colors.magenta+ format.bold + 
			'Usage: scraping lyngsat\n\n' + colors.reset + colors.green + 
			'	[-v | --verbose] \n	Verbose output, prints all scraped data on console and process\n\n' +
			'	[-h | --help] \n	Prints Help \n\n' +
			' [-hs | --headless]\n	Runs the browser in headless mode\n\n' +
			'	[-wl | --without-launches]\n	Skips scraping of launch data\n\n' +
			'	[-wc | --without-channels]\n	Skips scraping of channel data\n\n' +
			' [-c | --clean]\n	Cleans up the data and writes to cleaned up files\n\n' +
			' [-db | --write-to-db]\n	Writes the data to the database\n\n' +

			+ colors.reset);
		return;
	}
	
	if (args.includes('-hs') || args.includes('--headless')) {
		browser = await puppeteer.launch({ headless: true });
	}
	else {
		browser = await puppeteer.launch({ headless: false });
	}
	console.log('Browser opened');

	if (!(args.includes('-ws') || args.includes('--without-satellites'))) {
		console.log( colors.magenta + format.bold + 'scraping satellites..' + colors.reset);
		satData = await satScrape(browser, regions, url);

		satellites = satData.map(sat => sat.satellite);
		console.log( satellites.length + ' satellites found');
	}	

	if (!(args.includes('-wc') || args.includes('--without-channels'))) {
		console.log( colors.magenta + format.bold + 'scraping channels..' + colors.reset);
		({ providerData, channelData, satChannelData } = await satChannelsScrape(browser, satellites.slice(244,366), url));
	}
	else {
		channelData = [];
	}

	if (!(args.includes('-wl') || args.includes('--without-launches'))) {
		console.log( colors.magenta + format.bold + 'scraping launches..' + colors.reset);
		launchData = await satLaunchesScrape(browser, satellites, url);	
	    let joinedSats = joinJSON(satData, launchData, 'satellite');
	    fs.writeFileSync('./final_satelliteData.json', JSON.stringify(joinedSats, null, 2));	
	}
	else {
		launchData = [];
	}

	if(args.includes('-c') || args.includes('--clean')) {
		console.log(colors.green + 'testing' + colors.reset);


	    // cleaning and db connection
	    console.log(colors.green + 'Cleaning up' + colors.reset);
	    // read files into json obj arrays
	    let satChannelData1 = JSON.parse(fs.readFileSync('./final_satChannelData.json'));
	    let tvChannelData1 = JSON.parse(fs.readFileSync('./final_tvChannelData.json'));
	    let providerData1 = JSON.parse(fs.readFileSync('./final_providerData.json'));
	    let satelliteData1 = JSON.parse(fs.readFileSync('./final_satelliteData.json'));

	    // join json obj arrays
	    let final_satChannelData = satChannelData1.flat();
	    let final_tvChannelData = tvChannelData1.flat();
	    let final_providerData = providerData1.flat();
		let final_satelliteData = satelliteData1.flat();
		console.log(final_providerData.length)
		console.log(final_satelliteData.length)
		console.log(final_satChannelData.length)
		console.log(final_tvChannelData.length)

	    // remove duplicate json objs
	    final_satChannelData = final_satChannelData.filter((v,i,a)=>a.findIndex(t=>(t === v))===i);
		final_providerData = final_providerData.filter((v,i,a)=>a.findIndex(t=>(t.providerName === v.providerName))===i);
		final_tvChannelData = final_tvChannelData.filter((v,i,a)=>a.findIndex(t=>(t.tvChannelName === v.tvChannelName))===i);
		console.log(final_providerData.length)
		console.log(final_satelliteData.length)
		console.log(final_satChannelData.length)
		console.log(final_tvChannelData.length)

		// write to cleaned up files
		fs.writeFileSync('./clean_satChannelData.json', JSON.stringify(final_satChannelData, null, 2));
		fs.writeFileSync('./clean_tvChannelData.json', JSON.stringify(final_tvChannelData, null, 2));
		fs.writeFileSync('./clean_providerData.json', JSON.stringify(final_providerData, null, 2));
		fs.writeFileSync('./clean_satelliteData.json', JSON.stringify(final_satelliteData, null, 2));

		await browser.close();
		return;
	}


	// print data if -v flag is passed
	if (args.includes('-v') || args.includes('--verbose')) {
		console.log( colors.cyan + format.bold + '\n\nSatellite data:\n' + colors.reset, satData);
		console.log( colors.cyan + format.bold + '\n\nLaunch data:\n' + colors.reset, launchData);
		console.log( colors.cyan + format.bold + '\n\nChannel data:\n' + colors.reset, channelData);
	}
	
	console.log(colors.green + 'Scraping complete' + colors.reset);
	await browser.close();
}

main();
