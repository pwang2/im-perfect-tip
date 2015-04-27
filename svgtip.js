(function() {
    'use strict';
    angular.module('imperfect-tip',[])
        .directive('imPerfectTip', svgtip);

    var xmlns = "http://www.w3.org/2000/svg";
    var tan225 = Math.tan(Math.PI * 22.5 / 180);
    var defaults = {
            padding: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
            },
            labelBorderWidth: 1,
            labelBorderStyle: 'solid',
            labelBorderColor: '#ccc',
            arrowEdge: 16,
            tipRaidus: 5,
            arrStyle: 'top-left'
        },
        forEach = Array.prototype.forEach;

    function camelCased(input, firstCap) {
        if (input) {
            input = input.trim();
            if (!/\d/g.test(input[0])) {
                var reg = /-(\w)/;
                if (firstCap) {
                    input = input[0].toUpperCase() + input.substring(1);
                }
                while (reg.test(input)) {
                    var match = reg.exec(input);
                    input = input.replace(match[0], match[1].toUpperCase());
                }
                return input;
            }
        }
        return '';
    }

    function getTipShape(bw, bh, tipStyle) {
        var shape = " M0 0" +
            " H{{e+w-r}}" +
            " Q{{e+w}} 0 {{e+w}} {{r}}" +
            " V{{h-r}} " +
            " Q{{e+w}} {{h}} {{e+w-r}} {{h}}" +
            " H{{e+r}}" +
            " Q{{e}} {{h}} {{e}} {{h-r}}" +
            " V{{e}}" +
            " L0 0Z";

        var r = tipStyle.tipRadius,
            e = tipStyle.arrowEdge,
            w = bw + tipStyle.paddingLeft + tipStyle.paddingRight,
            h = bh + tipStyle.paddingTop + tipStyle.paddingBottom;

        var reg = /\{\{([^\}]*)\}\}/gm;
        var matchArr;
        var shapeCopy = shape;
        while (true) {
            matchArr = reg.exec(shape);
            if (!matchArr) {
                break;
            }
            /*jshint ignore:start */
            shapeCopy = replaceAll(shapeCopy, matchArr[0], eval(matchArr[1]));
            /*jshint ignore:end*/
        }
        return shapeCopy;
    }

    function escapeRegExp(string) {
        return string.replace(/[\.\*\+\?\^\$\{\}\(\)\|\[\\\]\\]/g, "\\$&");
    }

    function replaceAll(str, find, replace) {
        return str.replace(new RegExp(escapeRegExp(find), 'gm'), replace);
    }

    function expandPadding(s) {
        /*jshint maxcomplexity:30 */
        var v = [];
        if (s.padding) {
            console.log(s.padding);
            v = s.padding.split(' ')
                .filter(function(n) {
                    return n.trim() !== '';
                });
            if (v.length === 1) {
                v = [v[0], v[0], v[0], v[0]];
            } else if (v.length === 2) {
                v = [v[0], v[1], v[0], v[1]];
            } else if (v.length === 3) {
                v = [v[0], v[1], v[2], v[0]];
            }
            delete s.padding;
        }
        s.paddingTop = parseFloat(s.paddingTop || v[0] || defaults.padding.top);
        s.paddingRight = parseFloat(s.paddingRight || v[1] || defaults.padding.right);
        s.paddingBottom = parseFloat(s.paddingBottom || v[2] || defaults.padding.bottom);
        s.paddingLeft = parseFloat(s.paddingLeft || v[3] || defaults.padding.left);
        return s;
    }

    function expandBorder(s) {
        /*jshint maxcomplexity:30 */
        var b = [];
        if (s.border) {
            b = s.border.split(' ')
                .filter(function(n) {
                    return n.trim() !== '';
                });
            delete s.border;
        }

        s.borderWidth = parseFloat(s.borderWidth || b[0] || defaults.labelBorderWidth);
        s.borderStyle = s.borderStyle || b[1] || defaults.labelBorderStyle;
        s.borderColor = s.borderColor || b[2] || defaults.labelBorderColor;
        return s;
    }

    function expandBackground(s) {
        var c;
        if (s.background) {
            c = s.background;
            delete s.background;
        }
        s.backgroundColor = s.backgroundColor || c || 'transparent';
        return s;
    }

    function expandStyle(s) {
        s = expandPadding(s);
        s = expandBorder(s);
        s = expandBackground(s);
        s.maxWidth = parseFloat(s.maxWidth);
        s.edgeEdge = s.borderWidth / 2 / tan225;
        return s;
    }

    function getColor(style) {
        return style.color || '#000';
    }

    function getFontSize(style) {
        return style.fontSize || '1em';
    }

    function getFontWeight(style) {
        return style.fontWeight || 'normal';
    }

    function getLineHeight(style) {
        if (!style.lineHeight) {
            style.lineHeight = '1em';
        } else if (/^\d{1,}$/g.test(style.lineHeight)) {
            style.lineHeight = style.lineHeight + 'em';
        }
        return style.lineHeight;
    }

    function createWordTspan(w, textGroup, style, breakline, firstword, lastword) {
        if (/^\d{1,}$/g.test(style.lineHeight)) {
            style.lineHeight = style.lineHeight + 'em';
        }
        var textNd = document.createElementNS(xmlns, 'tspan');
        textGroup.appendChild(textNd);
        setAttr(textNd, 'fill', getColor(style));
        setAttr(textNd, 'font-size', getFontSize(style));
        setAttr(textNd, 'font-weight', getFontWeight(style));
        if (breakline) {
            setAttr(textNd, 'x', '0');
            setAttr(textNd, 'dy', getLineHeight(style));
        } else {
            if (firstword) {
                setAttr(textNd, 'y', getLineHeight(style));
            }
        }

        var word = document.createTextNode(w + (lastword ? '' : ' '));
        textNd.appendChild(word);
        return textNd;
    }

    function drawText(clone, textGroup, s) {
        forEach.call(clone, function(n, i) {
            var ndName = n.nodeName.toLowerCase();
            //    n.style = n.style || {};
            var wordlist = n.innerText.trim().split(/[\s]/g);

            wordlist.forEach(function(w, j) {
                var textNd,
                    firstW = (j === 0),
                    lastW = (j === wordlist.length - 1);
                if (ndName === 'span') {
                    textNd = createWordTspan(w, textGroup, n.style, false, true, lastW);
                    //foreach text node(span or div), span will always append to previous
                } else if (ndName === 'div') {
                    if (j === 0) {
                        //if the current node is div, will only change to new line at the first word.
                        textNd = createWordTspan(w, textGroup, n.style, true);
                    } else {
                        textNd = createWordTspan(w, textGroup, n.style, false, firstW, lastW);
                    }
                }
                //try to append
                //append the word itself first, if not overflow, try to add the space,
                //if the added space cause an overflow, write text at next line,
                //if not, continue write next word at current line
                var curw = textGroup.getBBox().width,
                    adjust; //a magic number do the work.
                if (curw + s.paddingLeft + s.paddingRight >= s.maxWidth) {
                    textGroup.removeChild(textNd);
                    var backw = textGroup.getBBox().width;
                    textNd = createWordTspan(w, textGroup, n.style, true);
                    adjust = Math.max(0, textGroup.getBBox().width - backw);
                    //magic number is here. sometime is after add a new word to line ending and remove it
                    //imediately, the remaining width of the container will be bigger than the value before
                    //adding.
                    s.maxWidth += adjust;
                }
            });
        });
    }

    function setAttr(el, prop, val) {
        el.setAttributeNS(null, prop, val);
    }

    function translatePath(tippath, pos, s, bw, bh) {
        var shapeTransfrom = {
            topleft: "translate(0,0)",
            bottomleft: 'translate(0, {{h}}) scale(1,-1)',
            topright: 'translate({{w+e-ee+bdw}}, 0) scale(-1,1)',
            bottomright: 'translate({{w+e-ee+bdw}}, {{h}}) scale(-1,-1)',
        };
        var posTrans = shapeTransfrom[pos];

        var bdw = s.borderWidth / 2,
            e = s.arrowEdge,
            ee = s.edgeEdge,
            w = bw + s.paddingLeft + s.paddingRight,
            h = bh + s.paddingTop + s.paddingBottom;

        var reg = /\{\{([^\}]*)\}\}/gm;
        var matchArr;
        var shapeCopy = posTrans;
        while (true) {
            matchArr = reg.exec(posTrans);
            if (!matchArr) {
                break;
            }
            /*jshint ignore:start */
            shapeCopy = replaceAll(shapeCopy, matchArr[0], eval(matchArr[1]));
            /*jshint ignore:end*/
        }
        setAttr(tippath, 'transform', shapeCopy);
    }

    function translateText(textGroup, pos, s, bw, bh) {
        var shapeTransfrom = {
            topleft: "translate(0,0)",
            bottomleft: 'translate(0, 0) ',
            topright: 'translate({{-ee-ed+bdw/2}}, 0)',
            bottomright: 'translate({{-ee-ed+bdw/2}},0)',
        };
        var posTrans = shapeTransfrom[pos];

        var bdw = s.borderWidth / 2,
            ed = s.arrowEdge,
            ee = s.edgeEdge,
            w = bw + s.paddingLeft + s.paddingRight,
            h = bh + s.paddingTop + s.paddingBottom;

        var reg = /\{\{([^\}]*)\}\}/gm;
        var matchArr;
        var shapeCopy = posTrans;
        while (true) {
            matchArr = reg.exec(posTrans);
            if (!matchArr) {
                break;
            }
            /*jshint ignore:start */
            shapeCopy = replaceAll(shapeCopy, matchArr[0], eval(matchArr[1]));
            /*jshint ignore:end*/
        }
        setAttr(textGroup, 'transform', shapeCopy);
    }

    function transferElement(clone, svgElem, s) {
        var gtext = document.createElementNS(xmlns, "g"),
            gpath = document.createElementNS(xmlns, "g"),
            textTransx = s.edgeEdge + s.paddingLeft + s.arrowEdge + s.borderWidth / 2,
            textTransy = parseFloat(s.paddingTop) + s.borderWidth / 2,
            pathTransx = s.edgeEdge + s.borderWidth / 2,
            pathTransy = s.borderWidth / 2;
        var tippath = document.createElementNS(xmlns, 'path');
        setAttr(tippath, 'fill', s.backgroundColor); //background should draw first
        setAttr(tippath, 'stroke', s.borderColor);
        setAttr(tippath, 'stroke-width', s.borderWidth);
        gpath.appendChild(tippath);

        setAttr(gtext, 'transform', 'translate(' + textTransx + ',' + textTransy + ')');
        setAttr(gpath, 'transform', 'translate(' + pathTransx + ',' + pathTransy + ')');
        svgElem.appendChild(gpath);
        svgElem.appendChild(gtext);

        //YES, we only need one text element here.
        var textGroup = document.createElementNS(xmlns, "text");
        gtext.appendChild(textGroup);
        drawText(clone, textGroup, s);

        var bbox = textGroup.getBBox();
        var path = getTipShape(bbox.width, bbox.height, s);
        setAttr(tippath, 'd', path);

        translatePath(tippath, s.tipPosition, s, bbox.width, bbox.height);
        translateText(textGroup, s.tipPosition, s, bbox.width, bbox.height);
        var tipW = bbox.width + s.edgeEdge + s.arrowEdge + s.paddingLeft + s.paddingRight + s.borderWidth * 2,
            tipH = bbox.height + s.paddingTop + s.paddingBottom + s.borderWidth;
        setAttr(svgElem, "viewBox", "0 0 " + tipW + " " + tipH);
        setAttr(svgElem, "width", tipW);
        setAttr(svgElem, "height", tipH);
    }

    function svgtip() {
        return {
            restrict: 'E',
            transclude: true,
            template: '<div class="sal-component-ctn sal-component-svgtip"></div>',
            scope: {},
            link: linkFn
        };

        function linkFn(scope, elem, attrs, ctrl, transcludeFn) {
            var styleAttr = attrs.tipStyle || '';
            var styleObj = {};
            var styleList = (styleAttr.split(';')
                .filter(function(n) {
                    return n.trim() !== '';
                })
                .forEach(function(n) {
                    var s = n.split(':');
                    styleObj[camelCased(s[0])] = s[1];
                }));

            styleObj.arrowEdge = parseFloat(attrs.arrowEdge || defaults.arrowEdge);
            styleObj.arrowStyle = attrs.arrStyle || defaults.arrowStyle;
            styleObj.tipRadius = parseFloat(attrs.tipRadius || defaults.tipRaidus);
            styleObj.tipPosition = attrs.tipPosition || 'topleft';
            styleObj = expandStyle(styleObj);

            console.log(JSON.stringify(styleObj));

            transcludeFn(scope, function(clone) {
                //clone is not a array
                console.log(Object.prototype.toString.call(clone));
                //single inner text will be wrapped as span
                //with respect to all span line break after transcluded,
                //the same as <span>text</span>
                if (clone.length > 1) {
                    //any tag elements will introduce empty text elements
                    //if we have space line break before or after the tag.
                    //we need to tidy up
                    clone = Array.prototype.filter.call(clone, function(n, i) {
                        return !(n.nodeName === "#text" && n.nodeValue.trim() === '');
                    });
                }
                var svgElem = document.createElementNS(xmlns, "svg");
                //need to append the svg element ahead, or the box caculation won't work
                elem.append(svgElem);
                transferElement(clone, svgElem, styleObj);
            });
        }
    }
}());
