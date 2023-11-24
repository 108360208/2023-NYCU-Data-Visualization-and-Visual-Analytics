var list = ["buying", "maintenance", "doors", "persons", "luggage_boot", "safety", "class"]
var dict_keylist = {}
var count = 0
var color = d3.scaleOrdinal(d3.schemeCategory10)
              .domain(list) 
              .range(d3.schemeCategory10); ;
              
for (var i = 0;i < list.length ; i++){
  dict_keylist[list[i]] = count
  count ++  
}


d3.sankey = function() {
  var sankey = {},
      nodeWidth = 24,
      nodePadding = 8,
      size = [1, 1],
      nodes = [],
      links = [];

  sankey.nodeWidth = function(_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function(_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function(_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function(_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.layout = function(iterations) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function() {
    computeLinkDepths();
    return sankey;
  };

  sankey.link = function() {
    var curvature = .5;

    function link(d) {
      var x0 = d.source.x + d.source.dx,
          x1 = d.target.x,
          xi = d3.interpolateNumber(x0, x1),
          x2 = xi(curvature),
          x3 = xi(1 - curvature),
          y0 = d.source.y + d.sy + d.dy / 2,
          y1 = d.target.y + d.ty + d.dy / 2;
      return "M" + x0 + "," + y0
           + "C" + x2 + "," + y0
           + " " + x3 + "," + y1
           + " " + x1 + "," + y1;
    }

    link.curvature = function(_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    nodes.forEach(function(node) {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(function(link) {
      var source = link.source,
          target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    nodes.forEach(function(node) {
      node.value = Math.max(
        d3.sum(node.sourceLinks, value),
        d3.sum(node.targetLinks, value)
      );
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {
    var remainingNodes = nodes,
        nextNodes,
        x = 0;

    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(function(node) {
        node.x = x;
        node.dx = nodeWidth;
        node.sourceLinks.forEach(function(link) {
          if (nextNodes.indexOf(link.target) < 0) {
            nextNodes.push(link.target);
          }
        });
      });
      remainingNodes = nextNodes;
      ++x;
    }

    //
    moveSinksRight(x);
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function moveSourcesRight() {
    nodes.forEach(function(node) {
      if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
      }
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(function(node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx) {
    nodes.forEach(function(node) {
      node.x *= kx;
    });
  }

  function computeNodeDepths(iterations) {
    var nodesByBreadth = d3.nest()
        .key(function(d) { return d.x; })
        .sortKeys(d3.ascending)
        .entries(nodes)
        .map(function(d) { return d.values; });

    //
    initializeNodeDepth();
    resolveCollisions();  
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeDepth() {
      var ky = d3.min(nodesByBreadth, function(nodes) {
        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
      });

      nodesByBreadth.forEach(function(nodes) {
        nodes.forEach(function(node, i) {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(function(link) {
        link.dy = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha) {
      nodesByBreadth.forEach(function(nodes, breadth) {
        nodes.forEach(function(node) {
          if (node.targetLinks.length) {
            var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedSource(link) {
        return center(link.source) * link.value;
      }
    }

    function relaxRightToLeft(alpha) {
      nodesByBreadth.slice().reverse().forEach(function(nodes) {
        nodes.forEach(function(node) {
          if (node.sourceLinks.length) {
            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target) * link.value;
      }
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(function(nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingDepth);
        
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }

  function computeLinkDepths() {
    nodes.forEach(function(node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(function(node) {
      var sy = 0, ty = 0;
      node.sourceLinks.forEach(function(link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function(link) {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};


function drawSankey(keylist, filename){
    d3.select("body").selectAll("*").remove();
    var screenWidth = Math.floor(window.innerWidth / 2); // 获取屏幕宽度的2分之1
    var screenHeight = Math.floor(window.innerHeight / 3); // 获取屏幕高度的3分之1
  
    const list = d3.select("body");
    list
    .append("h1")
    .text("Lab8 Sankey Diagram")
    const items = list.selectAll("li")
      .data(keylist, (d) => d);

    // 计算总高度
    let totalHeight = 0;

    const newItem = items.enter()
      .append("li")
      .text(function(d){
        return d;
      })
      .attr("draggable", true)
      .style("width", `${screenWidth}px`)
      .style("height", function(d) {
        // 设置每个li元素的高度，并将其加到totalHeight中
        const height = screenHeight / keylist.length;
        totalHeight += height;
        return `${height}px`;
      })
      .style("background-color", function(d){
        return color(d);
      })
    items.exit().remove();

    // 检查总高度，如果超出3分之1的屏幕高度，可以根据需要进行调整
    if (totalHeight > screenHeight) {
      console.log("Total height exceeds 1/3 of screen height. You may need to adjust the height of each item.");
    }

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
          const movedItem = keylist[fromIndex];
          keylist.splice(fromIndex, 1);
          keylist.splice(i, 0, movedItem);

          drawSankey(keylist, filename);
        }
      });


      var units = "Counts";
      screenWidth = Math.floor(window.innerWidth * 3 / 4); 
      screenHeight = Math.floor(window.innerHeight * 2 / 3); 


      // set the dimensions and margins of the graph
      var margin = {top: 10, right: 10, bottom: 10, left: 10},
          width = screenWidth  - margin.left - margin.right,
          height = screenHeight  - margin.top - margin.bottom;

      // format variables
      var formatNumber = d3.format(",.0f"),    // zero decimal places
          format = function(d) { return formatNumber(d) + " " + units; }
      
          



      // append the svg object to the body of the page
      var svg = d3.select("body").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", 
                "translate(" + margin.left + "," + margin.top + ")");

      // Set the sankey diagram properties
      var sankey = d3.sankey()
          .nodeWidth(20)
          .nodePadding(20)
          .size([width, height]);

      var path = sankey.link();


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
      .style("width", `${Math.floor(window.innerWidth / 8)}px`)
      .text("1.透過移動上方的長條格子來改變Sankey Diagram的排列順序 2.將鼠標懸停在桑基圖中的條帶上,來顯示屬性間的頻率記數");
  
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


      d3.text(filename, function(text) {
            var data = d3.csvParseRows(text);
            var attributeCount = {}; // 用于存储属性组合的计数

            data.forEach(function(row) {
              for (var i = 0 ; i < keylist.length -1 ; i++ ){
                source_index = dict_keylist[keylist[i]]
                target_index = dict_keylist[keylist[i+1]]
 
                var combination = keylist[i] + "_" + row[source_index] + "," + keylist[i+1] + "_" + row[target_index];
                  if (attributeCount[combination]) {
                    attributeCount[combination]++;
                  } else {
                    attributeCount[combination] = 1;         
                }
              }
            });

            var dataArray = [];
            for (var key in attributeCount) {
              var parts = key.split(",");
              dataArray.push({
                source: parts[0],
                target: parts[1],
                value: attributeCount[key]
              });
            }
            graph = {"nodes" : [], "links" : []};

            dataArray.forEach(function (d) {
              graph.nodes.push({ "name": d.source });
              graph.nodes.push({ "name": d.target });
              graph.links.push({ "source": d.source,
                                "target": d.target,
                                "value": +d.value });
            });
              graph.nodes = d3.keys(d3.nest()
              .key(function (d) { return d.name; })
              .object(graph.nodes));

            // loop through each link replacing the text with its index from node
            graph.links.forEach(function (d, i) {
              graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
              graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
            });

            // now loop through each nodes to make nodes an array of objects
            // rather than an array of strings
            graph.nodes.forEach(function (d, i) {
              graph.nodes[i] = { "name": d };
            });

            sankey
                .nodes(graph.nodes)
                .links(graph.links)
                .layout(32);

            // add in the links
            var link = svg.append("g").selectAll(".link")
                .data(graph.links)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", path)
                .style("stroke-width", function(d) { return Math.max(1, d.dy); })
                .sort(function(a, b) { return b.dy - a.dy; });

            // add the link titles
            link.append("title")
                  .text(function(d) {
                  return d.source.name + " → " + 
                          d.target.name + "\n" + format(d.value); });

            // add in the nodes
            var node = svg.append("g").selectAll(".node")
                .data(graph.nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { 
                return "translate(" + d.x + "," + d.y + ")"; })
                .call(d3.drag()
                  .subject(function(d) {
                    return d;
                  })
                  .on("start", function() {
                    this.parentNode.appendChild(this);
                  })
                  .on("drag", dragmove));

            // add the rectangles for the nodes
            node.append("rect")
                .attr("height", function(d) { return d.dy; })
                .attr("width", sankey.nodeWidth())
                .style("fill", function(d) { 
                  
                    if(d.name.replace(/_.*$/, "") == "luggage"){
                      return color("luggage_boot")
                }
                return d.color = color(d.name.replace(/_.*$/, "")); })
                .style("stroke", function(d) { 
                return d3.rgb(d.color).darker(2); })
                .append("title")
                .text(function(d) { 
                
                return d.name + "\n" + format(d.value); });
                var left_mindistance  = 10000
                node.each(function(d) {
                  if((width / 2 - d.x ) < left_mindistance && (width / 2 - d.x ) > 0){
                    left_mindistance = width/2 -d.x             
                  }                   
                });
                var right_mindistance  = 10000
                node.each(function(d) {
    
                  if((d.x - width / 2) < right_mindistance && (d.x - width / 2) > 0){
                    right_mindistance = d.x - width / 2             
                  }                   
                });
       
            // add in the title for the nodes
            node.append("text")
                .attr("x", -6)
                .attr("y", function(d) { 
                  // console.log(d);
                  
                  // if(d.x < width / 2 && (width / 2 - d.x  == left_mindistance))
                  // {             
                  //   return d.dy / 2
                  // } 
                  // else if (d.x > width /2 && ((d.x - (width / 2) ) == right_mindistance)){
                    
                  //   return d.dy / 2 
                  // }     
                  return d.dy  / 2; 
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "end").style("font-size", "8px")
                .attr("transform", null)
                .text(function(d) { return d.name; })
                .filter(function(d) { return d.x < width / 2; })
                .attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", "start")
                ;

            // the function for moving the nodes
            function dragmove(d) {
              d3.select(this)
                .attr("transform", 
                      "translate(" 
                        + d.x + "," 
                        + (d.y = Math.max(
                            0, Math.min(height - d.dy, d3.event.y))
                          ) + ")");
              sankey.relayout();
              link.attr("d", path);
            }
            
        })
}





function createlegend(color, keylist){
  
    var legendData = []
    for (var key of keylist) {
      legendData.push(
          {
            "category" : key,
            "color" : color(key)
          }
        )
    }
    // console.log(legendData)
    var legendContainer = d3.select("body");
    
    var legendItems = legendContainer
    .selectAll("li")
    .data(legendData)
    .enter()
    .append("li");  
    // console.log(legendItems)
    legendItems
    .append("span")
    .style("background-color", function(d) {
        return d.color;
    })
    .classed("legend-color-box", true);

    legendItems
    .append("span")
    .text(function(d) {
        // console.log(d.category)
        return d.category;
    });

}