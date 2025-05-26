const margin = { top: 50, right: 40, bottom: 60, left: 70 };  // left, bottom margin 약간 더 크게 조정
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

let allData = [];

const colorScale = d3.scaleOrdinal()
  .domain(["Physics", "Chemistry", "Medicine"])
  .range(["#003f5c", "#ffa600", "#739375"]);

const histMargin = { top: 40, right: 30, bottom: 60, left: 70 };  // 히스토그램 margin도 동일하게
const histWidth = 800 - histMargin.left - histMargin.right;
const histHeight = 300 - histMargin.top - histMargin.bottom;

const histSvg = d3.select("#histogram")
  .append("svg")
  .attr("width", histWidth + histMargin.left + histMargin.right)
  .attr("height", histHeight + histMargin.top + histMargin.bottom)
  .append("g")
  .attr("transform", `translate(${histMargin.left},${histMargin.top})`);

// 히스토그램에 대한 스케일과 축, 바 그룹을 전역 변수로 만들어 재사용
let xHistScale = d3.scaleLinear().range([0, histWidth]);
let yHistScale = d3.scaleLinear().range([histHeight, 0]);

const xHistAxis = histSvg.append("g")
  .attr("transform", `translate(0,${histHeight})`);
const yHistAxis = histSvg.append("g");

// 히스토그램 축 레이블 (한 번만 그리기)
histSvg.append("text")
  .attr("class", "x label")
  .attr("x", histWidth / 2)
  .attr("y", histHeight + 45)
  .attr("text-anchor", "middle")
  .attr("fill", "black")
  .text("ΔT (Prize Year - Pub Year)");

histSvg.append("text")
  .attr("class", "y label")
  .attr("transform", "rotate(-90)")
  .attr("x", -histHeight / 2)
  .attr("y", -55)
  .attr("text-anchor", "middle")
  .attr("fill", "black")
  .text("Number of Papers");

d3.csv("data/prize_winning_papers.csv").then(data => {
  data.forEach(d => {
    d["Pub year"] = +d["Pub year"];
    d["Prize year"] = +d["Prize year"];
    d.deltaT = d["Prize year"] - d["Pub year"];
  });

  allData = data;

  drawScatter("All");
  drawHistogram(d3.max(allData, d => d["Prize year"]));

  d3.select("#fieldSelect").on("change", function () {
    drawScatter(this.value);
  });

  d3.select("#yearSlider")
    .attr("min", d3.min(allData, d => d["Prize year"]))
    .attr("max", d3.max(allData, d => d["Prize year"]))
    .property("value", d3.max(allData, d => d["Prize year"]))
    .on("input", function () {
      d3.select("#sliderValue").text(this.value);
      drawHistogram(+this.value);
      stopAnimation();
    });
});

function drawScatter(fieldFilter) {
  const filtered = fieldFilter === "All" ? allData : allData.filter(d => d.Field === fieldFilter);

  svg.selectAll("*").remove();

  const xScale = d3.scaleLinear()
    .domain(d3.extent(allData, d => d["Pub year"]))
    .nice()
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(allData, d => d["Prize year"]))
    .nice()
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  svg.append("g")
    .call(d3.axisLeft(yScale).tickFormat(d3.format("d")));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .text("Publication Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .text("Prize Year");

  svg.selectAll("circle")
    .data(filtered)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d["Pub year"]))
    .attr("cy", d => yScale(d["Prize year"]))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.Field))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.95);
      tooltip.html(`<strong>${d["Laureate name"]}</strong><br><em>${d["Title"]}</em><br><strong>Field:</strong> ${d.Field}<br>Pub: ${d["Pub year"]} | Prize: ${d["Prize year"]}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 40) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", (event, d) => {
      d3.select("#details-panel").html(`
        <h3>Name: ${d["Laureate name"]}</h3>
        <p><strong>Field:</strong> ${d.Field}</p>
        <p><strong>Laureate ID:</strong> ${d["Laureate ID"]}</p>
        <p><strong>Title:</strong> ${d["Title"]}</p>
        <p><strong>Publication Year:</strong> ${d["Pub year"]}</p>
        <p><strong>Prize Year:</strong> ${d["Prize year"]}</p>
        <p><strong>ΔT:</strong> ${d.deltaT}</p>
      `);
    });

  // 범례
  const legendData = colorScale.domain();
  d3.select("#legend").selectAll("*").remove();

  const legend = d3.select("#legend")
    .selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("div")
    .attr("class", "legend-item");

  legend.append("div")
    .attr("class", "legend-color")
    .style("background-color", d => colorScale(d));

  legend.append("span")
    .text(d => d);
}

// 히스토그램 부드러운 업데이트 함수
function drawHistogram(maxPrizeYear) {
  const filtered = allData.filter(d => d["Prize year"] <= maxPrizeYear);
  const deltaTs = filtered.map(d => d.deltaT);
  const xMax = d3.max(deltaTs);

  // x, y 스케일 domain 업데이트
  xHistScale.domain([0, xMax]).nice();

  // bins 만들기
  const binsGenerator = d3.bin()
    .domain(xHistScale.domain())
    .thresholds(20);

  const bins = binsGenerator(deltaTs);
  const yMax = d3.max(bins, d => d.length);
  yHistScale.domain([0, yMax]).nice();

  // 축 업데이트 (transition 포함)
  xHistAxis.transition().duration(500).call(d3.axisBottom(xHistScale));
  yHistAxis.transition().duration(500).call(d3.axisLeft(yHistScale));

  // 데이터 바인딩
  const bars = histSvg.selectAll("rect")
    .data(bins);

  // 기존 막대 업데이트 (위치, 크기, 색상)
  bars.transition()
    .duration(500)
    .attr("x", d => xHistScale(d.x0) + 1)
    .attr("y", d => yHistScale(d.length))
    .attr("width", d => Math.max(0, xHistScale(d.x1) - xHistScale(d.x0) - 1))
    .attr("height", d => histHeight - yHistScale(d.length))
    .attr("fill", "#69b3a2");

  // 새로운 막대 추가
  bars.enter()
    .append("rect")
    .attr("x", d => xHistScale(d.x0) + 1)
    .attr("y", histHeight)
    .attr("width", d => Math.max(0, xHistScale(d.x1) - xHistScale(d.x0) - 1))
    .attr("height", 0)
    .attr("fill", "#69b3a2")
    .transition()
    .duration(500)
    .attr("y", d => yHistScale(d.length))
    .attr("height", d => histHeight - yHistScale(d.length));

  // 필요 없는 막대 제거
  bars.exit()
    .transition()
    .duration(500)
    .attr("y", histHeight)
    .attr("height", 0)
    .remove();
}

// 애니메이션 타이머 관련
let animationTimer = null;

function startAnimation() {
  if (animationTimer !== null) return;
  const slider = d3.select("#yearSlider");
  let currentVal = +slider.property("value");
  const maxVal = +slider.attr("max");

  animationTimer = setInterval(() => {
    if (currentVal >= maxVal) {
      clearInterval(animationTimer);
      animationTimer = null;
      d3.select("#playPauseBtn").text("▶️ Play");
      return;
    }
    currentVal++;
    slider.property("value", currentVal);
    d3.select("#sliderValue").text(currentVal);
    drawHistogram(currentVal);
  }, 100);
}

function stopAnimation() {
  if (animationTimer !== null) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
}

// 슬라이더 input 이벤트에 stopAnimation 포함 (이미 위에서 연결해둠)

d3.select("#playPauseBtn").on("click", function () {
  const btn = d3.select(this);
  if (animationTimer === null) {
    btn.text("⏸ Pause");
    startAnimation();
  } else {
    btn.text("▶️ Play");
    stopAnimation();
  }
});

