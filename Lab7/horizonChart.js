
const keylist = ["SO2", "NO2", "O3", "CO", "PM10", "PM2.5"];
function drawHorizonChart(filename, selectedYear, selectedBand) {

    const chartContainer = document.getElementById("chart-container");
    // 清空 chart-container 中的所有子元素
    while (chartContainer.firstChild) {
        chartContainer.removeChild(chartContainer.firstChild);
    }
            // processed_data(filename)
    bands = parseInt(selectedBand)   

    const colorSchemes = {
        "SO2": d3.schemeBlues, // 为 "SO2" 关键字绑定 D3.js 颜色方案 Blues
        "NO2": d3.schemeGreens, // 为 "NO2" 关键字绑定 D3.js 颜色方案 Greens
        "O3": d3.schemeGreys,   // 为 "O3" 关键字绑定 D3.js 颜色方案 Greys
        "CO": d3.schemeOranges, // 为 "CO" 关键字绑定 D3.js 颜色方案 Oranges
        "PM10": d3.schemePurples, // 为 "PM10" 关键字绑定 D3.js 颜色方案 Purples
        "PM2_5": d3.schemeYlOrBr  // 为 "PM2.5" 关键字绑定 D3.js 颜色方案 Reds
    };
    
    const screenWidth = window.innerWidth; // 获取屏幕宽度
    const screenHeight = window.innerHeight; // 获取屏幕高度
    

    processed_data(filename, selectedYear)
        .then(function(result) {
            let data = result
            
            data.forEach(function(data) {
                // 在这里你可以访问每个数据项的 Address 和 values
                // console.log("Address:", data.Address);
                for (const key in colorSchemes){
                    HorizonChart(data.values, {
                        x: d => d.date,
                        y: d => d.measurements[key],
                        z: d => d.Address,
                        bands,
                        width : screenWidth* 3/ 4,
                        size : screenHeight / 20,
                        scheme : colorSchemes[key]
                    })
                }
                // 提取 values 数组
                // console.log(data.values)
            });
            // 在这里可以使用处理后的数据
        })  
        .catch(function(error) {
            console.error(error);
        });
}
function standardize(data) {
    const mean = d3.mean(data);
    const deviation = d3.deviation(data);
    
    return data.map(value => (value - mean) / deviation);
}
    

function processed_data(filename, selectedYear) {
    return d3.csv(filename, { type: "text" })
        .then(function(data) {
            const attributes = ["SO2", "NO2", "O3", "CO", "PM10", "PM2_5"];
            
      
            data.forEach(function(d) {
                d["Measurement date"] = d3.timeDay(new Date(d["Measurement date"]));
            });
            if(selectedYear != "all"){
                data = data.filter(function(d) {
                    return (d["Measurement date"]).getFullYear().toString() == selectedYear;
                });
            }
            
            // Use D3.js version 7 nest() function to group data by Address and date
            var dataByDate = d3.group(data, d => d.Address, d => d["Measurement date"]);
            const result = Array.from(dataByDate, ([key, values]) => ({
        
                values: Array.from(values, ([date, group]) => ({
                    Address: key,
                    date: date,
                    measurements: {
                        SO2: d3.mean(group, d => parseFloat(d.SO2)),
                        NO2: d3.mean(group, d => parseFloat(d.NO2)),
                        O3: d3.mean(group, d => parseFloat(d.O3)),
                        CO: d3.mean(group, d => parseFloat(d.CO)),
                        PM10: d3.mean(group, d => parseFloat(d.PM10)),
                        PM2_5: d3.mean(group, d => parseFloat(d['PM2.5']))
                    }
                }))
            }));
   
            return result;
        });
}

function HorizonChart(data, {
    x = ([x]) => x, // given d in data, returns the (temporal) x-value
    y = ([, y]) => y, // given d in data, returns the (quantitative) y-value
    z = () => 1, // given d in data, returns the (categorical) z-value
    defined, // for gaps in data
    curve = d3.curveLinear, // method of interpolation between points
    marginTop = 20, // top margin, in pixels
    marginRight = 0, // right margin, in pixels
    marginBottom = 0, // bottom margin, in pixels
    marginLeft = 0, // left margin, in pixels
    width = 750, // outer width, in pixels
    size = 25, // outer height of a single horizon, in pixels
    bands = 3, // number of bands
    padding = 1, // separation between adjacent horizons
    xType = d3.scaleUtc, // type of x-scale
    xDomain, // [xmin, xmax]
    xRange = [marginLeft, width - marginRight], // [left, right]
    yType = d3.scaleLinear, // type of y-scale
    yDomain, // [ymin, ymax]
    yRange = [size, size - bands * (size - padding)], // [bottom, top]
    zDomain, // array of z-values
    scheme = d3.schemeGreys, // color scheme; shorthand for colors
    colors = scheme[Math.max(3, bands)], // an array of colors
  } = {}) {
    

    // Compute values.
    const X = d3.map(data, x);
    const Y = d3.map(data, y);
    const Z = d3.map(data, z);
    // console.log(z)
    if (defined === undefined) defined = (d, i) => !isNaN(X[i]) && !isNaN(Y[i]);
    const D = d3.map(data, defined);
    
    // Compute default domains, and unique the z-domain.
    if (xDomain === undefined) xDomain = d3.extent(X);
    if (yDomain === undefined) yDomain = [0, d3.max(Y)];
    if (zDomain === undefined) zDomain = Z;
    zDomain = new d3.InternSet(zDomain);
    
    // Omit any data not present in the z-domain.
    const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));
  
    // Compute height.
    const height = zDomain.size * size + marginTop + marginBottom;
  
    // Construct scales and axes.
    const xScale = xType(xDomain, xRange);
    const yScale = yType(yDomain, yRange);
   
    const xAxis = d3.axisTop(xScale).ticks(width / 80).tickSizeOuter(0);
    // console.log(xDomain)
    // A unique identifier for clip paths (to avoid conflicts).
    const uid = `O-${Math.random().toString(16).slice(2)}`;
  
    // Construct an area generator.
    const area = d3.area()
        .defined(function(i) {return D[i]})
        .curve(curve)
        .x(i => xScale(X[i]))
        .y0(yScale(0))
        .y1(i => yScale(Y[i]));
    
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10);
  
    const g = svg.selectAll("g")
      .data(d3.group(I, i => Z[i]))
      .join("g")
        .attr("transform", (_, i) => `translate(0,${i * size + marginTop})`);
  
    const defs = g.append("defs");
  
    defs.append("clipPath")
        .attr("id", (_, i) => `${uid}-clip-${i}`)
        .append("rect")
        .attr("y", padding)
        .attr("width", width)
        .attr("height", size - padding);
  
    defs.append("path")
        .attr("id", (_, i) => `${uid}-path-${i}`)
        .attr("d", ([, I]) => area(I));
  
    g
      .attr("clip-path", (_, i) => `url(${new URL(`#${uid}-clip-${i}`, location)})`)
      .selectAll("use")
      .data((d, i) => new Array(bands).fill(i))
      .join("use")
        .attr("fill", (_, i) => colors[i + Math.max(0, 3 - bands)])
        .attr("transform", (_, i) => `translate(0,${i * size})`)
        .attr("xlink:href", (i) => `${new URL(`#${uid}-path-${i}`, location)}`);
  
    g.append("text")
        .attr("x", marginLeft)
        .attr("y", (size + padding) / 2)
        .attr("dy", "0.35em")
        .text(([z]) => z);
  
    // Since there are normally no left or right margins, don’t show ticks that
    // are close to the edge of the chart, as these ticks are likely to be clipped.
    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)
        .call(xAxis)
        .call(g => g.selectAll(".tick")
          .filter(d => xScale(d) < 10 || xScale(d) > width - 10)
          .remove())
        .call(g => g.select(".domain").remove());


    document.getElementById("chart-container").appendChild(svg.node());
    // return svg.node()
  }
