
function stackedbar(filename) {

    // read in data
    d3.csv(filename, function(data){

        const [uniqueKeys, formattedData] = processed_data(data)
        
        renderList(uniqueKeys, formattedData)
        drawRiver(uniqueKeys, formattedData)
    });
}
function processed_data(data){

    var groupedData = d3.nest()
    .key(function(d) { return d.saledate; })
    .entries(data);

    // 创建新的行属性
    var formattedData = groupedData.map(function(group) {
        var row = {
            saledate: group.key,
        };
        group.values.forEach(function(item) {
            row['type_' + item.type + '_bedrooms_' + item.bedrooms] = item.MA;
        });
        return row;
    });
    var allKeys = [];
    formattedData.forEach(function(dataObj) {
        var keysForDataObj = Object.keys(dataObj).filter(function(key) {
            return key !== 'saledate';
        });
        allKeys = allKeys.concat(keysForDataObj);
    });
    
    var parseTime = d3.timeParse("%d/%m/%Y");
    var formatTime = d3.timeFormat("%Y-%m-%d");

    // 遍历formattedData并转换saledate属性的值
    formattedData.forEach(function(dataObj) {
        dataObj.saledate = formatTime(parseTime(dataObj.saledate));
    });

    // 移除重复的键，如果需要
    var uniqueKeys = Array.from(new Set(allKeys));            
    
    formattedData.forEach(function(dataObj) {
        uniqueKeys.forEach(function(key) {
            if (!dataObj[key]) {
                dataObj[key] = '0';
            }
        });
    });
    
    formattedData.sort(function(a, b) {
        return new Date(a.saledate) - new Date(b.saledate);
    });
    
    return [uniqueKeys, formattedData]
}

var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

function drawRiver(uniqueKeys , formattedData){

    var margin = { top: 50, bottom: 50, left: 50, right: 50 },
    width = 850 - margin.left - margin.right,
    height = 650 - margin.top - margin.bottom;

    var canvas = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    reverse_uniqueKeys =  [...uniqueKeys];
    reverse_uniqueKeys = reverse_uniqueKeys.reverse()

    var formatTime = d3.timeFormat("%Y-%m-%d");
            var stacks = d3.stack()
                .offset(d3.stackOffsetSilhouette)
                .keys(reverse_uniqueKeys);
            var layers = stacks(formattedData)
        
            var [minX, maxX] = d3.extent(formattedData, function(dataObj) {
                return dataObj.saledate;
            });
            var minY = d3.min(layers, function(l) {
                return d3.min(l, function(d) {
                    return d[0];
                })
            });
        
            var maxY = d3.max(layers, function(l) {
                return d3.max(l, function(d) {
                    return d[1];
                })
            })
            
            
            var xScale = d3.scaleTime()
                .domain([new Date(minX), new Date(maxX)])
                .range([80, width-80]);

            var yScale = d3.scaleLinear()
                .domain([minY, maxY])
                .range([height-80, 80]);
            
            var yAxisScale = d3.scaleLinear()
                .domain([0, 2*maxY])
                .range([height-80, 80]);

            var area = d3.area()
                .curve(d3.curveCardinal)
                .x(function(d){
                    //console.log(xScale(new Date(d.data.saledate)))
                    return xScale(new Date(d.data.saledate));
                })
                .y0(function(d){           
                    return yScale(d[0]);
                })
                .y1(function(d){
                    return yScale(d[1]);
                });
            
            var tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
          
       
            canvas.selectAll("g")
                .data(layers)
                .enter()
                .append("g")
                .attr("fill", function(d) { 
                    return colorScale(d.key);
                })
            canvas.selectAll("path") // create rect in panels.html
                    .data(layers)
                    .enter()
                    .append("path")
                    .attr("d", area)
                    .attr("fill", function(d) {
                        return colorScale(d.key);
                    });

                canvas.selectAll("path")
                .attr("opacity", 1)
                .on("mousemove", function(d, i) {
                    var mouseX = d3.mouse(this)[0];
                    var invertedX = xScale.invert(mouseX);
                    
                    var mouseY = d3.mouse(this)[1];
                    var invertedY = yScale.invert(mouseY);
                    var currDashboardData;
                    // console.log(d[parseInt(numRowScale(parseInt(invertedX)))].data.values);

                    tooltip.html("Stream name: " +reverse_uniqueKeys[i]+
                        "<br>Year: " +formatTime(invertedX)+
                        "<br>Value: " +(yAxisScale.invert(mouseY)))  
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")
                        .style("opacity", .9);           
            
                canvas.selectAll("path")
                    .attr("opacity", function(d, j) {
                        if(j != i) {
                            return 0.5;
                        }
                        else {
                            return 1;
                        }
                    });
                })      
                .on("mouseout", function(d) {
                    canvas.selectAll("path")
                        .attr("opacity", 1);
                    tooltip.style("opacity", 0);
                });
                canvas.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + (height-80) + ")")
                    .call(d3.axisBottom(xScale));
                canvas.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(80,0)")
                    .call(d3.axisLeft(yAxisScale));
                    var initialElements = canvas
                    .selectAll("text")
                    .data(reverse_uniqueKeys)
                    .enter()
                    .append("text")
                    .text(function(d) { return d; })
                    .attr("x", function(d, i) { return i * 50; })
                    .attr("y", 50);
}

function renderList(uniqueKeys, formattedData) {
    d3.select("body").selectAll("*").remove();

    d3.select("body")
    .append("h1")
    .text("Lab6 ThemeRiver")

    d3.select("body")
    .append("ul")
    .attr("id", "sortable-list");
    const list = d3.select("#sortable-list");
    const items = list.selectAll("li")
      .data(uniqueKeys, (d) => d)
    
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tip")
        .style("position", "fixed")
        .style("right", "10px")
        .style("bottom", "10px")
        .style("background-color", "#ff5733")
        .style("color", "#fff")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("display", "none")
        .text("透過移動上方的長條格子，來對每條河流做重新排序");
    
    // 鼠标进入事件，显示提示框
    d3.select("body")
        .on("mouseover", function() {
            tooltip.style("display", "block");
        });
    
    // 鼠标移出事件，隐藏提示框
    d3.select("body")
        .on("mouseout", function() {
            tooltip.style("display", "none");
        });
    // Enter



    const newItem = items.enter()
      .append("li")
      .text(function(d){
        return d
      })
      .attr("draggable", true)
      
    // Exit
    items.exit().remove();
  
    // Drag and drop functionality
    newItem.merge(items)
      .on("dragstart", (d, i) => {
        d3.event.dataTransfer.setData("text/plain", i);
      })
      .on("dragover", (d, i) => {
        d3.event.preventDefault();
      })
      .on("drop", (d, i) => {
        d3.event.preventDefault();
        const fromIndex = d3.event.dataTransfer.getData("text/plain");
        if (fromIndex !== i) {
          const movedItem = uniqueKeys[fromIndex];
          uniqueKeys.splice(fromIndex, 1);
          uniqueKeys.splice(i, 0, movedItem);
        //   console.log(uniqueKeys)
          renderList(uniqueKeys, formattedData);
          drawRiver(uniqueKeys , formattedData)
        }
      });
 
  }