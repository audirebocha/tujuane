import express from 'express'
import bodyParser from 'body-parser'
import Hits from '../Models/Hits.js'


const jsonParser=bodyParser.jsonParser

const router=express.Router({ mergeParams: true })
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }));

router.get('/',(req,res)=>{
    res.json({"hello":'World'})
})

router.post('/handshake',(req,res)=>{
    console.log(req.params,req.body,req.query)
    res.json({"hello":'World'})
})

router.get('/NHits',async function (req,res){
    var result = await Hits.count()
    res.json({'ans':result})
})

export default router