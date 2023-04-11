//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    function callback(data){
        csvData = data[0];    
        blockGroup = data[1];    
        //france = data[2];
        console.log(csvData);
        console.log(blockGroup);

        var blockGroups = topojson.feature(blockGroup, blockGroup.objects.blockGroups).features;
            //franceRegions = topojson.feature(france, france.objects.FranceRegions);

            //create graticule generator
            var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
               
                //create graticule background
                var gratBackground = map.append("path")
                .datum(graticule.outline()) //bind graticule background
                .attr("class", "gratBackground") //assign class for styling
                .attr("d", path) //project graticule
    
            //create graticule lines
               //var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
               //.data(graticule.lines()) //bind graticule lines to each element to be created
               //.enter() //create an element for each datum
              // .append("path") //append each element to the svg as a path element
              // .attr("class", "gratLines") //assign class for styling
              // .attr("d", path); //project graticule lines
    
        //examine the results
       // console.log(europeCountries);
        //add Europe countries to map
        var county = map.append("path")
            .datum(blockGroups)
            .attr("class", "county")
            .attr("d", path);

        //add France regions to map --> do I need to have another enumeration unit?
        var regions = map
            .selectAll(".regions")
            .data(blockGroups)
            .enter()
            .append("path")
            .attr("class", function(d){
                //what do I put for admin1_code? --> unique identifier in the data
                return "regions " + d.properties.adm1_code;
            })
            .attr("d", path);

        
    }


    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
   var map = d3.select("body")
       .append("svg")
       .attr("class", "map")
       .attr("width", width)
       .attr("height", height);

    //create Albers equal area conic projection centered on Dane County
    var projection = d3.geoConicEqualArea()
    .center([-5.5, 44.8])
    .rotate([81, 0, 0.5])
    .parallels([26, 25])
    .scale(15000)
    .translate([width / 2, height / 2])
    .angle([4]);

        var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];    
    promises.push(d3.csv("data/allOccur.csv")); //load attributes from csv    
    promises.push(d3.json("data/block-groups.json")); //load background spatial data       
    Promise.all(promises).then(callback);
}