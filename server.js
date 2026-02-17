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

  const peopleParams = {
    'fields': '*,squads.*',
    'filter[squads][squad_id][tribe][name]': 'FDND Jaar 1',
    'filter[squads][squad_id][cohort]': '2526',
    // 'filter[birthdate][_gte]': `${startYear}-01-01`,
    // 'filter[birthdate][_lte]': `${endYear}-12-31`,
    'sort': 'birthdate'

  }
  const personResponse = await fetch('https://fdnd.directus.app/items/person/?' + new URLSearchParams(peopleParams))
  const personResponseJSON = await personResponse.json()
  // loop door iedereen heen om ze hun maandindex te kunnen geven
  const startYear = 1970
  const endYear = 2007
  const startMonth = 0;
  const endMonth = 11
  const totalMonths = (endYear - startYear) * 12

  // iedereen buiten de tijdlijn lekker weggooien
  const filteredData = personResponseJSON.data.filter(person => {
    let datePerson = new Date(person.birthdate)
    let personYear = datePerson.getFullYear()
    return personYear >= startYear && personYear <= endYear && personYear !== 1970
  })

  const monthTracker = {}

  filteredData.forEach(person => {
    let datePerson = new Date(person.birthdate)
    let personYear = datePerson.getFullYear()
    let personMonth = datePerson.getMonth()
    let personDay = datePerson.getDate()
    console.log(personYear, personMonth, personDay)
    let monthKey = `${personYear}-${personMonth}`

    if (!(monthKey in monthTracker)) {
      monthTracker[monthKey] = 1;
      person.stack_index = 0;
    } else {
      person.stack_index = monthTracker[monthKey];
      monthTracker[monthKey]++
    }

    person.maand_index = (personYear - startYear) * 12 + personMonth
    // person.left = (100 - 25 * person.stack_index) * person.maand_index + 'px';
    person.left = 100 * person.maand_index - 100 * person.stack_index + 'px';
    console.log(person.maand_index)
  });

  response.render('index.liquid', {
    teamName: teamName,
    messages: messagesResponseJSON.data,
    persons: filteredData,
    totalMonths: totalMonths
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


  response.render('person.liquid', { person: personDetailResponseJSON.data })
})

app.set('port', process.env.PORT || 8000)

if (teamName == '') {
  console.log('Voeg eerst de naam van jullie team in de code toe.')
} else {
  app.listen(app.get('port'), function () {
    console.log(`Application started on http://localhost:${app.get('port')}`)
  })
}
