/*
 * MIT License
 * © Copyright 2016 - Geoffrey Brossard (me@geoffreybrossard.fr)
 */
// D3 Parliament plugin (fixed version)
d3.parliament = function() {
    var width,
        height,
        innerRadiusCoef = 0.4;

    var enter = {
            "smallToBig": true,
            "fromCenter": true
        },
        update = {
            'animate': true,
        },
        exit = {
            "bigToSmall": true,
            "toCenter": true
        };

    var parliamentDispatch = d3.dispatch("click", "dblclick", "mousedown", "mouseenter",
        "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "touchcancel", "touchend",
        "touchmove", "touchstart");

    function parliament(selection) {
        selection.each(function(d) {
            // Fix: Use the actual width/height if provided, otherwise use getBoundingClientRect
            var actualWidth = width || this.getBoundingClientRect().width || 500;
            var actualHeight = height || actualWidth / 2;

            var outerParliamentRadius = Math.min(actualWidth/2, actualHeight);
            var innerParliementRadius = outerParliamentRadius * innerRadiusCoef;

            var svg = d3.select(this);

            // Calculate total seats
            var nSeats = 0;
            d.forEach(function(p) { 
                nSeats += (typeof p.seats === 'number') ? Math.floor(p.seats) : p.seats.length; 
            });

            // Calculate rows
            var nRows = 0;
            var maxSeatNumber = 0;
            var b = 0.5;
            var a = innerRadiusCoef / (1 - innerRadiusCoef);
            
            while (maxSeatNumber < nSeats) {
                nRows++;
                b += a;
                maxSeatNumber = series(function(i) { return Math.floor(Math.PI * (b + i)); }, nRows-1);
            }

            // Create seats
            var rowWidth = (outerParliamentRadius - innerParliementRadius) / nRows;
            var seats = [];
            var seatsToRemove = maxSeatNumber - nSeats;
            
            for (var i = 0; i < nRows; i++) {
                var rowRadius = innerParliementRadius + rowWidth * (i + 0.5);
                var rowSeats = Math.floor(Math.PI * (b + i)) - Math.floor(seatsToRemove / nRows) - (seatsToRemove % nRows > i ? 1 : 0);
                var anglePerSeat = Math.PI / rowSeats;
                
                for (var j = 0; j < rowSeats; j++) {
                    var s = {};
                    s.polar = {
                        r: rowRadius,
                        teta: -Math.PI + anglePerSeat * (j + 0.5)
                    };
                    s.cartesian = {
                        x: s.polar.r * Math.cos(s.polar.teta),
                        y: s.polar.r * Math.sin(s.polar.teta)
                    };
                    seats.push(s);
                }
            }

            // Sort seats by angle
            seats.sort(function(a,b) {
                return a.polar.teta - b.polar.teta || b.polar.r - a.polar.r;
            });

            // Assign parties to seats
            var partyIndex = 0;
            var seatIndex = 0;
            seats.forEach(function(s) {
                var party = d[partyIndex];
                var nSeatsInParty = typeof party.seats === 'number' ? party.seats : party.seats.length;
                
                if (seatIndex >= nSeatsInParty) {
                    partyIndex++;
                    seatIndex = 0;
                    party = d[partyIndex];
                }

                s.party = party;
                s.data = typeof party.seats === 'number' ? null : party.seats[seatIndex];
                seatIndex++;
            });

            // Helper functions
            var seatClasses = function(d) {
                var c = "seat ";
                c += (d.party && d.party.id) || "";
                return c.trim();
            };
            var seatX = function(d) { return d.cartesian.x; };
            var seatY = function(d) { return d.cartesian.y; };
            var seatColor = function(d) { return d.party.color; };
            var seatRadius = function(d) {
                var r = 0.4 * rowWidth;
                if (d.data && typeof d.data.size === 'number') {
                    r *= d.data.size;
                }
                return r;
            };

            // Create parliament container
            var container = svg.select(".parliament");
            if (container.empty()) {
                container = svg.append("g");
                container.classed("parliament", true);
            }
            container.attr("transform", "translate(" + actualWidth / 2 + "," + outerParliamentRadius + ")");

            // Create circles for seats
            var circles = container.selectAll(".seat").data(seats);
            
            // Remove old circles
            circles.exit().remove();
            
            // Add new circles
            var circlesEnter = circles.enter().append("circle");
            circlesEnter.attr("class", seatClasses);
            circlesEnter.attr("cx", enter.fromCenter ? 0 : seatX);
            circlesEnter.attr("cy", enter.fromCenter ? 0 : seatY);
            circlesEnter.attr("r", enter.smallToBig ? 0 : seatRadius);
            circlesEnter.attr("fill", seatColor);
            circlesEnter.attr("stroke", "#333");
            circlesEnter.attr("stroke-width", 0.5);

            // Animate entrance
            if (enter.fromCenter || enter.smallToBig) {
                var t = circlesEnter.transition().duration(1000);
                if (enter.fromCenter) {
                    t.attr("cx", seatX);
                    t.attr("cy", seatY);
                }
                if (enter.smallToBig) {
                    t.attr("r", seatRadius);
                }
            }

            // Update existing circles
            circles.merge(circlesEnter)
                .attr("cx", seatX)
                .attr("cy", seatY)
                .attr("r", seatRadius)
                .attr("fill", seatColor);
        });
    }

    parliament.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return parliament;
    };

    parliament.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return parliament;
    };

    parliament.innerRadiusCoef = function(value) {
        if (!arguments.length) return innerRadiusCoef;
        innerRadiusCoef = value;
        return parliament;
    };

    parliament.enter = {
        smallToBig: function (value) {
            if (!arguments.length) return enter.smallToBig;
            enter.smallToBig = value;
            return parliament.enter;
        },
        fromCenter: function (value) {
            if (!arguments.length) return enter.fromCenter;
            enter.fromCenter = value;
            return parliament.enter;
        }
    };

    parliament.exit = {
        bigToSmall: function (value) {
            if (!arguments.length) return exit.bigToSmall;
            exit.bigToSmall = value;
            return parliament.exit;
        },
        toCenter: function (value) {
            if (!arguments.length) return exit.toCenter;
            exit.toCenter = value;
            return parliament.exit;
        }
    };

    return parliament;

    function series(s, n) { 
        var r = 0; 
        for (var i = 0; i <= n; i++) { 
            r += s(i); 
        } 
        return r; 
    }
};