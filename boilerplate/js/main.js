//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function () {

    //pseudo-global variables
    var attrArray = ["all_occurances", "01_occur", "c2to3", "c4to9", "c10plus"];
    var expressed = attrArray[0];

    var chartWidth = window.innerWidth * 0.45,
        chartHeight = 473,
        leftPadding = 30,
        rightPadding = 5,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 2000]);

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {
        var width = window.innerWidth * 0.45,
            height = 465;

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

            createDropdown(csvData);

            var blockGroups = topojson.feature(blockGroup, blockGroup.objects.blockGroups).features;
            //franceRegions = topojson.feature(france, france.objects.FranceRegions);
            blockGroups = joinData(blockGroups, csvData);

            var county = map.append("path") //is this block in the wrong spot?
                .datum(blockGroups)
                .attr("class", "county")
                .attr("d", path);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(blockGroups, map, path, colorScale);

            setChart(csvData, colorScale);

            makeLegend(colorScale);

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


    function makeColorScale(data) {
        var colorClasses = [
            "#dee2e6",
            "#ADB5BD",
            "#495057",
            "#000000"
        ];
    
        // Ensure that the color scale includes 0 in the domain
        var minmax = [
            d3.min(data, function (d) { return parseFloat(d[expressed]); }),
            d3.max(data, function (d) { return parseFloat(d[expressed]); })
        ];
        
        // Check if the minimum value is greater than 0, and if so, set the minimum to 0
        if (minmax[0] > 0) {
            minmax[0] = 0;
        }
    
        // Create color scale with updated domain
        var colorScale = d3.scaleQuantile()
            .range(colorClasses)
            .domain(minmax);
    
        return colorScale;
    }
    
    
    function setEnumerationUnits(blockGroups, map, path, colorScale) {
        // ...
    
        var regions = map.selectAll(".regions")
            .data(blockGroups)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "regions id" + d.properties.FID_1;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value === 0) {
                    // Handle the case when the value is 0
                    return colorScale(0);
                } else if (value) {
                    return colorScale(value);
                } else if (d.properties.FID_1 == 277 || d.properties.FID_1 == 278) {
                    return "#caf0f8";
                } else {
                    return "#ccc";
                }
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
    
        // ...
    };
    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {

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

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "bar id" + d.FID_1;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
        //removed attributes from this line

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of single and multiple evictions per one household" + " in each block group");

        updateChart(bars, csvData.length, colorScale);
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);


        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');
    };
    function createDropdown(csvData) {
        var left = document.querySelector('.map').getBoundingClientRect().left + 5,
            top = document.querySelector('.map').getBoundingClientRect().top + 5;

        console.log(top)
        //add select element

        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .style('left', left + "px")
            .style("top", top + "px")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")

            .attr("value", function (d) {
                return d;
            })
            .text(function (d) {
                return d;
            });

        //OPTIONS BLOCKS FROM EXAMPLE 1.1 LINES 8-19
    };
    //Example 1.4 line 14...dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3
            .selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                }
                else if (d.properties.FID_1 == 277 || d.properties.FID_1 == 278) {
                    return "#caf0f8"
                }
                else {
                    return "#ccc";
                }
            });

        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function (d, i) {
                return i * 100;
            })
            .duration(800);

        updateChart(bars, csvData.length, colorScale);
        
        d3.select(".legend").remove();
        makeLegend(colorScale);
    }; //end of changeAttribute()

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale) {
        //position bars
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3
            .select(".chartTitle")
            .text("Number of single and multiple evictions per one household" + " in each block group");
    };

    //function to highlight enumeration units and bars
    function highlight(props) {
        console.log(d3.selectAll(".id" + props.FID_1))
        //change stroke
        var selected = d3.selectAll(".id" + props.FID_1)
            .style("stroke", "#c1121f")
            .style("stroke-width", "2.5");
        setLabel(props);
    };

    function dehighlight(props) {
        var selected = d3.selectAll(".id" + props.FID_1)
            .style("stroke", function () {
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabel")
            .remove();
    };


    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.FID_1 + "_label")
            .html(labelAttribute);

        var blockGroups = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

    //function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel").node().getBoundingClientRect().width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

    function makeLegend(color) {
        var width = 300,
            height = 300;
        topBottomPadding = 5;
        var left = document.querySelector('.map').getBoundingClientRect().left + 10,
            bottom = document.querySelector('.map').getBoundingClientRect().bottom + 10;

        var svg = d3.select("body")
            .append("svg")
            .attr("class", "legend")
            .attr("width", width)
            .attr("height", height)
            .style("position","absolute")
            .style('left', left + "px")
            .style("top", bottom + "px")


        var legend = svg.selectAll('g.legendEntry')
            .data(color.range().reverse())
            .enter()
            .append('g').attr('class', 'legendEntry')

        legend
            .append('rect')
            .style("float", 'left')
            .attr("x", width - 200)
            .attr("y", function (d, i) {
                return i * 20;
            })
            .attr("width", 15)
            .attr("height", 15)
            .style("stroke", "black")
            .style("stroke-width", 1)
            .style("fill", function (d) { return d; });

        //the data objects are the fill colors

        legend
            .append('text')
            .attr("x", width - 175) //leave 5 pixel space after the <rect>
            .attr("y", function (d, i) {
                return i * 20;
            })

            .attr("dy", "0.8em") //place text one line *below* the x,y point
            .text(function (d, i) {
                var extent = color.invertExtent(d);
                //extent will be a two-element array, format it however you want:
                var format = d3.format("0.2f");
                return format(+extent[0]) + " - " + format(+extent[1]);
            })
    }

})(); //last line of main.js;