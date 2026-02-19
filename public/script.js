// neem de class van form en sla het op als const
const form = document.querySelector('.filters')

// check of const bestaat
if (form) {

    const inputs = form.querySelectorAll('input, select')
    // console.log(inputs)
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            form.submit()
        })
    })
}

// 1. Haal de eeste li op van de ol met class people-line met query selector sla op in een const
    const firstPerson = document.querySelector('.person-list-item')

// 2. Check of de const bestaat
    if (firstPerson) {
        firstPerson.scrollIntoView({ behavior: "smooth", inline: "center" });
    }

// 3. scroll naar het element toe als het bestaat 
// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView#using_scrollintoview

