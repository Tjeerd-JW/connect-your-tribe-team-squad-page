import express from 'express'

import { Liquid } from 'liquidjs';

// Vul hier jullie team naam in
const teamName = 'Delight';

const app = express()

app.use(express.static('public'))

const engine = new Liquid();
app.engine('liquid', engine.express());

app.set('views', './views')

app.use(express.urlencoded({ extended: true }))

app.get('/', async function (request, response) {

  console.log(request.query)

  // Filter eerst de berichten die je wilt zien, net als bij personen
  // Deze tabel wordt gedeeld door iedereen, dus verzin zelf een handig filter,
  // bijvoorbeeld je teamnaam, je projectnaam, je person ID, de datum van vandaag, etc..
  const commentParams = {
    'filter[for]': `Team ${teamName}`,
  }

  // Maak hiermee de URL aan, zoals we dat ook in de browser deden
  const apiURL = 'https://fdnd.directus.app/items/messages?' + new URLSearchParams(commentParams)

  // Laat eventueel zien wat de filter URL is
  // (Let op: dit is _niet_ de console van je browser, maar van NodeJS, in je terminal)
  // console.log('API URL voor messages:', apiURL)

  // Haal daarna de messages data op
  const messagesResponse = await fetch(apiURL)

  // Lees van de response van die fetch het JSON object in, waar we iets mee kunnen doen
  const messagesResponseJSON = await messagesResponse.json()

  // tijdlijn lengte uit de url halen bijv: /?start=2000&end=2001 alleen mensen van 2000-01-01 t/m 2001-12-31
  // als je niks invuld is het 1971 t/m 2007
  const startYear = request.query.start ? parseInt(request.query.start) : 1998
  const endYear = request.query.end ? parseInt(request.query.end) : 2008
  const season = request.query.season
  const hobby = request.query.hobby
  const vibes = request.query.vibes

  const peopleParams = {
    'fields': '*,squads.*',
    'filter[squads][squad_id][tribe][name]': 'FDND Jaar 1',
    'filter[squads][squad_id][cohort]': '2526',
    'sort': 'birthdate',
    'filter[birthdate][_gte]': `${startYear}-01-01`,
    'filter[birthdate][_lte]': `${endYear}-12-31`,
  }
  const year = request.query.year

  console.log({ hobby })

  console.log(vibes)

  if (year) {
    let startYear, endYear;
    switch (year) {
      case '1970': startYear = 1970; endYear = 1979; break;
      case '1980': startYear = 1980; endYear = 1989; break;
      case '1990': startYear = 1990; endYear = 1999; break;
      case '2000': startYear = 2000; endYear = 2009; break;
    }
    // peopleParams['filter[birthdate][_gte]'] = `${startYear}-01-01`;
    // peopleParams['filter[birthdate][_lte]'] = `${endYear}-12-31`;
  }

  if (season) {
    peopleParams['filter[fav_season][_icontains]'] = season
  }
  if (hobby) {
    peopleParams['filter[fav_hobby][_icontains]'] = hobby
  }
  if (vibes) {
    peopleParams['filter[vibe_emoji][_icontains]'] = vibes
  }

  const personResponse = await fetch('https://fdnd.directus.app/items/person/?' + new URLSearchParams(peopleParams))
  const personResponseJSON = await personResponse.json()
  // loop door iedereen heen om ze hun maandindex te kunnen geven

  // iedereen buiten de tijdlijn lekker weggooien
  const filteredData = personResponseJSON.data.filter(person => {
    let datePerson = new Date(person.birthdate)
    let personYear = datePerson.getFullYear()
    return personYear >= startYear && personYear <= endYear && personYear !== 1970
  })

  // hier mee check ik of er meerdere mensen in 1 maand zijn geboren
  const monthTracker = {}

  filteredData.forEach(person => {
    let datePerson = new Date(person.birthdate)
    let personYear = datePerson.getFullYear()
    let personMonth = datePerson.getMonth()
    let monthKey = `${personYear}-${personMonth}`

    if (!(monthKey in monthTracker)) {
      monthTracker[monthKey] = 2;
      person.stack_index = 3;
    } else {
      person.stack_index = monthTracker[monthKey];
      monthTracker[monthKey]--
    }

    person.maand_index = (personYear - startYear) * 12 + personMonth + 1
    person.left = 100 * person.maand_index - 100 * person.stack_index + 'px';
  });

  const monthNames = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december"
  ];

  const totalMonths = (endYear - startYear) * 12
  // hier komen de maanden voor de tijdljn te staan
  const months = []
  const years = []
  for (let year = startYear; year <= endYear; year++) {
    years.push({
      year: year,
      year_index: year - startYear + 1
    })
    for (let month = 0; month < 12; month++) {
      months.push({
        year: year,
        month: month + 1,
        month_name: monthNames[month],
        month_index: (year - startYear) * 12 + month
      })
    }
  }

  response.render('index.liquid', {
    teamName: teamName,
    messages: messagesResponseJSON.data,
    persons: filteredData,
    totalMonths: totalMonths,
    months: months,
    years: years,
    activeSeason: season,
    activeHobby: hobby,
    activeVibes: vibes,
    activeYear: year
  })
})

app.post('/', async function (request, response) {

  // Stuur een POST request naar de messages tabel
  // Een POST request bevat ook extra parameters, naast een URL
  await fetch('https://fdnd.directus.app/items/messages', {

    // Overschrijf de standaard GET method, want ook hier gaan we iets veranderen op de server
    method: 'POST',

    // Geef de body mee als JSON string
    body: JSON.stringify({
      // Dit is zodat we ons bericht straks weer terug kunnen vinden met ons filter
      for: `Team ${teamName}`,
      // En dit zijn onze formuliervelden
      from: request.body.from,
      text: request.body.text
    }),

    // En vergeet deze HTTP headers niet: hiermee vertellen we de server dat we JSON doorsturen
    // (In realistischere projecten zou je hier ook authentication headers of een sleutel meegeven)
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });

  // Stuur de browser daarna weer naar de homepage
  response.redirect(303, '/')
})

app.get('/person/:id', async function (request, response) {
  const personDetailResponse = await fetch('https://fdnd.directus.app/items/person/' + request.params.id)
  const personDetailResponseJSON = await personDetailResponse.json()
  const commentParams = {
    'filter[for]': `Team ${teamName}` + request.params.id,
  }


  const apiURL = 'https://fdnd.directus.app/items/messages?' + new URLSearchParams(commentParams)
  const messagesResponse = await fetch(apiURL)

  const messagesResponseJSON = await messagesResponse.json()
  console.log(messagesResponseJSON)
  response.render('person.liquid', {
    person: personDetailResponseJSON.data,
    comments: messagesResponseJSON.data,

  })
})

app.post('/person/:id', async function (request, response) {
  await fetch('https://fdnd.directus.app/items/messages', {

    method: 'POST',
    body: JSON.stringify({
      for: `Team ${teamName}` + request.params.id,
      from: request.body.from,
      text: request.body.text
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'

    }
  });
  response.redirect(303, `/person/${request.params.id}`)
})


app.set('port', process.env.PORT || 8000)

if (teamName == '') {
  console.log('Voeg eerst de naam van jullie team in de code toe.')
} else {
  app.listen(app.get('port'), function () {
    console.log(`Application started on http://localhost:${app.get('port')}`)
  })
}
