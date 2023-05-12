const app = require('express')();
const bodyParser = require('body-parser');
const multer  = require('multer');
const csv = require('csvtojson');
const { Configuration, OpenAIApi } = require("openai");

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.render('index');
});

const upload = multer({ dest: 'uploads/' });

app.post('/uploadCSV', upload.single('csvFile'), async (req, res, next) => {

    let fileName = req.file.filename;
    let filterType = req.body.filterType;
    let filteredData = [];
    let preDefinedFilters = ['m', 'f', '18 35', '35 55'];
    
    const jsonArray = await csv().fromFile(`./uploads/${fileName}`);

    if(filterType == 'All') {
        jsonArray.splice(0, 1);
        filteredData = jsonArray.map(data => {
            return data.field3;
        });
    }else {

        let userSelectedFilters = req.body.filter;

        if (typeof(userSelectedFilters) === 'string') {

            filteredData.push(filterByCondition(userSelectedFilters, jsonArray));
        }else {

            for(let con of userSelectedFilters) {

                if(preDefinedFilters.includes(con)) {
                    filteredData.push(...filterByCondition(con, jsonArray));
                }
            }
        }
    }
    
    let coments = `Draft an executive summary which make sense using these statements "${filteredData.join()}"`;

    if(coments.length >= 4097) {
        coments = coments.slice(0, 4097);
        coments = coments.slice(0, coments.lastIndexOf(',')) + "\"";
    };
    let chatGPT = await getResponseFromChatGPT(coments);

    res.json(chatGPT);
});

const filterByCondition = (condition, jsonArray) => {

    let filteredData = [];

    switch(condition) {

        case 'm':
            for(let data of jsonArray) {
                if(data.field5 == 'm') {
                    filteredData.push(data.field3);
                }
            }
            break;

        case 'f':
            for(let data of jsonArray) {
                if(data.field5 == 'f') {
                    filteredData.push(data.field3);
                }
            }
            break;

        case '18 35':
            for(let data of jsonArray) {
                if(data.field4 >= '18' && data.field4 <= '35') {
                    filteredData.push(data.field3);
                }
            }
            break;

        case '35 55':
            for(let data of jsonArray) {
                if(data.field4 >= '35' && data.field4 <= '55') {
                    filteredData.push(data.field3);
                }
            }
            break;

        default:
            break;
    }

    return filteredData;
}

const getResponseFromChatGPT = async (msg) => {

    const configuration = new Configuration({
        apiKey: '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',
    });

    const openai = new OpenAIApi(configuration);
      
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: `${msg}`}]
    });
    
    return completion.data.choices[0].message.content;
}

app.listen(3001, () => { console.log('Server is running on 3001') });