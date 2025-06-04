function addMonths(date, months) {
    date = new Date(date);
    const day = date.getDate();
    date.setMonth(date.getMonth() + months);
    if (date.getDate() !== day) {
        date.setDate(0);
    }
    return date;
}

d3.linegraph = function(
    showTickLimit,
    hideDots,
    partyKeys,
    partyColorMap,
    partyLabelMap,
    yMax,
    yMin,
    xAxisExtraMonths
) {
    // Default configuration
    if (!partyKeys) {
        partyKeys = ['pop', 'pat', 'prog', 'rust', 'stats', 'socs', 'other'];
    }
    if (!partyColorMap) {
        partyColorMap = {
            'pop': '#64138a',
            'prog': '#2d9eb5',
            'rust': '#1e7d0e',
            'stats': '#1c161b',
            'socs': '#bfb30d',
            'other': '#a0a0a0'
        };
    }
    if (!partyLabelMap) {
        partyLabelMap = {
            'pop': 'Populists: Werudforeng',
            'prog': 'Progress: ',
            'rust': 'Rustiks: Rustikforeg',
            'stats': 'Statists: Ricsforeng',
            'socs': 'Socialist: Samraedisk Swinkersforeng',
            'other': 'Others'
        };
    }
    if (!xAxisExtraMonths) {
        xAxisExtraMonths = 10;
    }

    // Chart dimensions and margins
    let chartWidth = 500;
    let chartHeight = 400;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 50;
    const marginLeft = 40;

    function linegraph(selection) {
        selection.each(function (rawData) {
            const allDates = rawData.map(d => new Date(d.date));
            const lastDate = d3.max(allDates);

            const dataByParty = partyKeys.map(key =>
                rawData.map(d => ({
                    x: new Date(d.date),
                    y: d[key],
                    party: key
                }))
            );

            const xScale = d3.scaleUtc()
                .domain([new Date(1897, 0), addMonths(lastDate, xAxisExtraMonths)])
                .range([marginLeft, chartWidth - marginRight]);

            let xAxis = d3.axisBottom(xScale)
                .tickFormat(d3.timeFormat('%b %Y'))
                .tickValues(allDates);

            if (showTickLimit) {
                xAxis = d3.axisBottom(xScale)
                    .tickFormat(d3.timeFormat('%b %Y'))
                    .ticks(10);
            }

            if (!yMax) {
                const maxY = d3.max(rawData, d => d.spd);
                const maxAlt = d3.max(rawData, d => d.nsdap);
                yMax = Math.max(maxY, maxAlt) + 10;
                yMin = 0;
            }

            const yScale = d3.scaleLinear()
                .domain([yMin, yMax])
                .range([chartHeight - marginBottom, marginTop]);

            const svg = d3.select(this);

            // Add X axis
            svg.append("g")
                .attr("transform", `translate(0,${chartHeight - marginBottom})`)
                .call(xAxis)
                .selectAll("text")
                .attr("text-anchor", "end")
                .attr("dx", "-0.8em")
                .attr("dy", "0.1em")
                .attr("transform", "rotate(-30)");

            // Add Y axis
            svg.append("g")
                .attr("transform", `translate(${marginLeft},0)`)
                .call(d3.axisLeft(yScale));

            const generateLine = party =>
                d3.line()
                    .x(d => xScale(d.x))
                    .y(d => yScale(d.y));

            // Draw lines
            for (const party of partyKeys) {
                svg.append("path")
                    .datum(rawData)
                    .attr("fill", "none")
                    .attr("stroke", partyColorMap[party])
                    .attr("stroke-width", 1.5)
                    .attr("class", `${party} party-line`)
                    .attr("id", `${party}-line`)
                    .attr("series", party)
                    .attr("d", generateLine(party)(rawData))
                    .on("mouseover", function () {
                        highlightSeries(party);
                        d3.select(this).attr("stroke-width", 5);
                    })
                    .on("mouseout", resetHighlight);
            }

            // Draw data points
            if (!hideDots) {
                svg.selectAll(".series")
                    .data(dataByParty)
                    .enter().append("g")
                    .selectAll(".point")
                    .data(d => d)
                    .enter().append("circle")
                    .attr("class", d => `${d.party} ${d.party}-node party-node`)
                    .attr("fill", d => partyColorMap[d.party])
                    .attr("series", d => d.party)
                    .attr("r", 4)
                    .attr("cx", d => xScale(d.x))
                    .attr("cy", d => yScale(d.y))
                    .on("mouseover", function () {
                        const party = d3.select(this).attr('series');
                        highlightSeries(party);
                    })
                    .on("mouseout", resetHighlight);
            }

            // Draw labels
            svg.selectAll(".labels")
                .data(dataByParty)
                .enter().append("text")
                .text(s => partyLabelMap[s[0].party])
                .attr("series", s => s[0].party)
                .attr("font-size", "0.8em")
                .attr("class", s => `${s[0].party}-label party-label`)
                .attr("x", s => xScale(s[s.length - 1].x) + 15)
                .attr("y", s => yScale(s[s.length - 1].y) + 5)
                .on("mouseover", function () {
                    const party = d3.select(this).attr('series');
                    highlightSeries(party);
                })
                .on("mouseout", resetHighlight);

            function highlightSeries(party) {
                d3.selectAll(".party-line").attr("stroke-width", 0.1);
                d3.selectAll(".party-node").attr("fill-opacity", 0.1);
                d3.selectAll(".party-label").attr("opacity", 0.1);
                d3.selectAll(`.${party}-node`).attr("fill-opacity", 1);
                d3.selectAll(`#${party}-line`).attr("stroke-width", 5);
                d3.selectAll(`.${party}-label`).attr("opacity", 1);
            }

            function resetHighlight() {
                d3.selectAll(".party-line").attr("stroke-width", 1.5);
                d3.selectAll(".party-node").attr("fill-opacity", 1);
                d3.selectAll(".party-label").attr("opacity", 1);
            }
        });
    }

    // Setters for chaining
    linegraph.width = function(value) {
        if (!arguments.length) return chartWidth;
        chartWidth = value;
        return linegraph;
    };

    linegraph.height = function(value) {
        if (!arguments.length) return chartHeight;
        chartHeight = value;
        return linegraph;
    };

    linegraph.parties = function(value) {
        if (!arguments.length) return partyKeys;
        partyKeys = value;
        return linegraph;
    };

    linegraph.partyNames = function(value) {
        if (!arguments.length) return partyLabelMap;
        partyLabelMap = value;
        return linegraph;
    };

    linegraph.partyColors = function(value) {
        if (!arguments.length) return partyColorMap;
        partyColorMap = value;
        return linegraph;
    };

    return linegraph;
};
