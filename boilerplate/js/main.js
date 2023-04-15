//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function () {

    //pseudo-global variables
    var attrArray = ["all_occurances", "01_occur", "c2to3", "c4to9", "c10plus"];
    var expressed = attrArray[0];

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {
        var width = window.innerWidth * 0.45,
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
        promises.push(d3.csv("data/blockgroup.csv")); //load attributes from csv    
        promises.push(d3.json("data/block-groups.json")); //load background spatial data       
        Promise.all(promises).then(callback);


        function callback(data) {
            csvData = data[0];
            blockGroup = data[1];


            var blockGroups = topojson.feature(blockGroup, blockGroup.objects.blockGroups).features;
            //franceRegions = topojson.feature(france, france.objects.FranceRegions);
            blockGroups = joinData(blockGroups, csvData);
            //create the color scale

            var colorScale = makeColorScale(csvData);
            //add enumeration units to the map
            setEnumerationUnits(blockGroups, map, path, colorScale);

            setChart(csvData, colorScale);

        }; //may be in the wrong spot


        }; //may be in the wrong spot/not suppose to be there


            function joinData(blockGroups, csvData) {
                //...DATA JOIN LOOPS FROM EXAMPLE 1.1
                for (var i = 0; i < csvData.length; i++) {
                    var csvRegion = csvData[i]; //the current region
                    var csvKey = csvRegion.FID_1; //the CSV primary key

                    //loop through geojson regions to find correct region
                    for (var a = 0; a < blockGroups.length; a++) {

                        var geojsonProps = blockGroups[a].properties; //the current region geojson properties
                        var geojsonKey = geojsonProps.FID_1; //the geojson primary key

                        //where primary keys match, transfer csv data to geojson properties object
                        if (geojsonKey == csvKey) {

                            //assign all attributes and values
                            attrArray.forEach(function (attr) {
                                var val = parseFloat(csvRegion[attr]); //get csv attribute value
                                geojsonProps[attr] = val; //assign attribute and value to geojson properties
                            });
                        };
                    };
                };
                return blockGroups;
            }


            //function to create color scale generator
            function makeColorScale(data) {
                var colorClasses = [
                    "#F7B267",
                    "#F4845F",
                    "#F25C54",
                    "#bc3908",
                    //"#980043"
                ];

                //create color scale generator
                var colorScale = d3.scaleThreshold()
                    .range(colorClasses);

                //build array of all values of the expressed attribute
                var domainArray = [];
                for (var i = 0; i < data.length; i++) {
                    var val = parseFloat(data[i][expressed]);
                    domainArray.push(val);
                };
                //cluster data using ckmeans clustering algorithm to create natural breaks
                var clusters = ss.ckmeans(domainArray, 3);
                //reset domain array to cluster minimums
                domainArray = clusters.map(function (d) {
                    return d3.min(d);
                });
                //remove first value from domain array to create class breakpoints
                domainArray.shift();
                //assign array of expressed values as scale domain
                colorScale.domain(domainArray);

                return colorScale;
            }
            var county = map.append("path") //is this block in the wrong spot?
                .datum(blockGroups)
                .attr("class", "county")
                .attr("d", path);
            //join csv data to GeoJSON enumeration units
            // blockGroups = joinData(blockGroups, csvData)

            function setEnumerationUnits(blockGroups, map, path, colorScale) {
                //add France regions to map --> do I need to have another enumeration unit?
                var regions = map.selectAll(".regions")
                    .data(blockGroups)
                    .enter()
                    .append("path")
                    .attr("class", function (d) {
                        return "regions " + d.properties.FID_1;
                    })
                    .attr("d", path)
                    .style("fill", function (d) {
                        var value = d.properties[expressed];
                        if (value) {
                            return colorScale(d.properties[expressed]);
                        } else {
                            return "#ccc";
                        }
                    });
            }
            //function to create coordinated bar chart
 //function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 30,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 2000]);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.adm1_code;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of single and multiple evictions per one household" + " in each block group");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};

   })(); //last line of main.js;
//};
//})(); //last line of main.js