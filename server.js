var AWS = require("aws-sdk");
const express = require("express")
const app = express()
const port = 3000

AWS.config.update({
    region: "us-east-1",
    endpoint: "http://dynamodb.us-east-1.amazonaws.com/",
  });

  var dynamodb = new AWS.DynamoDB();

  const bucket = { 
      Bucket: "csu44000assign2useast20",
      Key: "moviedata.json"
  }
  app.listen(port, ()=>console.log(`Example app listening on port ${port}!`))

  app.get('/', (_, res) => {
    res.sendFile(__dirname + '/index.html');                //send to index.html
  })

  app.get('/check', async (_, res) => {                     //check if table exists
    var params = {
        TableName: "Movies"
    };
    dynamodb.describeTable(params, function(err, data) {    
        if (err) return res.json({ success: false });       //if false table doesnt exist
        else     res.json({ success: true });               //if true table exists
    })
  })

  app.get('/delete', async (_, res) => {                    //delete table
    var params = {
        TableName : "Movies"
    };
    
    dynamodb.deleteTable(params, function(err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
            return res.json({ success: false });
        } else {
            console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
            return res.json({ success: true });
        }
    });

})

  app.get('/create', async (_, res) => {
    try {
        const s3 = new AWS.S3({endpoint: "https://s3.us-east-1.amazonaws.com"})   //Amazon Simple Storage Service 
        let response = await s3.getObject(bucket).promise()                       //get bucket
        let data = JSON.parse(response.Body.toString('utf-8'))                    //get data reable
        allMovies = data                                                          //set allMovies = data        
    }
    catch(err){
        console.log(err);
    }
    var params = {
        TableName : "Movies",
        KeySchema: [       
            { AttributeName: "year", KeyType: "HASH"},  //Partition key
            { AttributeName: "title", KeyType: "RANGE" }  //Sort key
        ],
        AttributeDefinitions: [       
            { AttributeName: "year", AttributeType: "N" },
            { AttributeName: "title", AttributeType: "S" }
        ],
        ProvisionedThroughput: {       
            ReadCapacityUnits: 5, 
            WriteCapacityUnits: 5
        }
    };

    dynamodb.createTable(params, function(err, data) {
        if (err) {
            console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    });
    var docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: 'Movies' /* required */
      };
      dynamodb.waitFor('tableExists', params, function(err, data) {
        if (err) {console.log(err, err.stack);} // an error occurred
        else  {
            allMovies.forEach(function(movie) {
                var params = {
                    TableName: "Movies",
                    Item: {
                        "year":  movie.year,
                        "title": movie.title,
                        "rank":  movie.info.rank
                    }
                };
        
            docClient.put(params, function(err, data) {
               if (err) {
                   console.error("Unable to add movie", movie.title, ". Error JSON:", JSON.stringify(err, null, 2));
               } else {
                   console.log("PutItem succeeded:", movie.title);
               }
            });
        });
        }
      });
      return res.json({ success: true }); 
})

    app.get('/query/:title/:year', async (req, res) => {
        var docClient = new AWS.DynamoDB.DocumentClient();
        let year = parseInt(req.params.year)
        let title = req.params.title
        var params = {
            TableName : "Movies",
            KeyConditionExpression: "#yr = :yyyy and begins_with(title, :letter1)",
            ExpressionAttributeNames:{
                "#yr": "year"
            },
            ExpressionAttributeValues: {
                ":yyyy": year,
                ":letter1": title
            }
        };
        
        docClient.query(params, function(err, data) {
            if (err) {
                console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                console.log("Query succeeded.");
                let result = []
                data.Items.forEach(function(item) {
                    let movie = {year: item.year, title: item.title, rank: item.rank}
                    result.push(movie)
                });
                return res.json({ result: result });
            }
        });
    })
    
  
