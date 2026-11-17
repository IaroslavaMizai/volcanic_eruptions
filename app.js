(function () {
  'use strict';

  var root = document.getElementById('app');
  var allRows = [];
  var volcanoEruptionCounts = Object.create(null);
  var mapSizeScale = { field: 'vei', min: 0, max: 8, transformedMin: 0, transformedMax: 8, minRadius: 3.5, maxRadius: 11.5, ready: false };
  var state = {
    selectedYear: '',
    theme: 'dark',
    country: '',
    region: '',
    subregion: '',
    volcanoType: '',
    veiCategory: '',
    riskTier: '',
    show: 'Eruptions',
    mapMode: 'globe',
    mapBlend: 0,
    mapTransitionFrom: 0,
    mapTransitionTo: 0,
    mapTransitionStart: 0,
    flatPanX: 0,
    flatPanY: 0,
    rotation: 0,
    rotationLat: -12,
    zoom: 1,
    spinning: false,
    dragging: false,
    mapPoints: [],
    markerRevealStart: 0,
    markerAnimationFrame: 0
  };
  var spinTimer = null;
  var yearPlaybackTimer = null;
  var yearFloor = 1925;
  var yearCeiling = 2024;
  var canvas, tooltip, themeSwitch, themeSunButton, themeMoonButton, yearPlayButton;
  var controls = {}, kpiRoot, trendRoot, tierRoot, legendRoot;
  var globeTitle, legendTitle, sizeGuide, trendTitle, trendSubtitle, tierTitle, tierSubtitle;

  var tierOrder = ['Minimal', 'Low', 'Moderate', 'High', 'Very High', 'Extreme', 'Catastrophic', 'Unknown'];
  var tierColors = {
    'Minimal': '#5b91aa',
    'Low': '#168ba5',
    'Moderate': '#aa850c',
    'High': '#c7721e',
    'Very High': '#bc4e3b',
    'Extreme': '#b33953',
    'Catastrophic': '#862e49',
    'Unknown': '#72899a'
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function svgNode(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }
  function socialIcon(name) {
    var icon = svgNode('svg', { viewBox: name === 'tableau' ? '0 0 512 512' : '0 0 24 24', class: 'sidebar-social-icon', 'aria-hidden': 'true', focusable: 'false' });
    if (name === 'tableau') {
      [
        'M242.69,340.3h26.62V267.7h67V241.88h-67v-72.6H242.69v72.6H176.54V267.7h66.15Z',
        'M119.26,445.18h22.59V380.64h59.7V360.47h-59.7V295.13H119.26v65.34H59.56v20.17h59.7Z',
        'M370.15,212h22.59V147.5h60.5V128.13h-60.5V62.79h-22.59v65.34h-59.7V147.5h59.7Z',
        'M246.72,496h19.36V450h41.15V433.08h-41.15v-46h-19.36v46h-40.33V450h40.33Z',
        'M120.07,212h21V146.69h60.51V128.13H141V62.79h-21v65.34H59.56v18.56h60.51Z',
        'M435.72,308.84h19.36V263.66H496V245.92H455.08V200.74h-19.36v45.18h-40.33v17.74h40.33Z',
        'M370.15,445.18h22.59V380.64h60.5V360.47h-60.5V295.13h-22.59v65.34h-59.7v20.17h59.7Z',
        'M307,74.08V60.37H266.66V16H252.14V60.37H211.81V74.08h40.33v44.37h14.52V74.08ZM56.11,305.61H70.63V261.24H111V247.53H70.63V204H56.11v43.56H16v14.52L56.11,262Z'
      ].forEach(function (path) {
        icon.appendChild(svgNode('path', { d: path, fill: 'currentColor' }));
      });
    } else if (name === 'github') {
      icon.appendChild(svgNode('path', { d: 'M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.41 3-.42 1.02 0 2.04.14 3 .42 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12Z', fill: 'currentColor' }));
    } else if (name === 'linkedin') {
      var letters = svgNode('text', { x: '1', y: '19', fill: 'currentColor', 'font-family': 'Arial, sans-serif', 'font-size': '22', 'font-weight': '700', 'letter-spacing': '-1' });
      letters.textContent = 'in';
      icon.appendChild(letters);
    }
    return icon;
  }
  function rowsOf(result) { return result && Array.isArray(result.data) ? result.data : []; }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function value(row, name) {
    if (!row) return null;
    if (row[name] !== undefined) return row[name];
    var wanted = norm(name);
    var key = Object.keys(row).find(function (candidate) { return norm(candidate) === wanted; });
    return key ? row[key] : null;
  }
  function locationValue(row, name) {
    if (norm(value(row, 'volcano_name') || '') === 'kickemjenny') {
      if (name === 'country') return 'Grenada';
      if (name === 'country_region') return 'Americas';
      if (name === 'country_subregion') return 'Caribbean';
      if (name === 'country_continent') return 'North America';
    }
    return value(row, name);
  }
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function isPresent(v) { return v !== null && v !== undefined && v !== ''; }
  function matchesCategory(valueToMatch, selected) {
    if (!selected) return true;
    return String(valueToMatch == null ? '' : valueToMatch).trim().toLocaleLowerCase() ===
      String(selected).trim().toLocaleLowerCase();
  }
  function numberText(n) { return Math.round(num(n)).toLocaleString('en-US'); }
  function compactText(n) {
    n = num(n);
    if (Math.abs(n) >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return numberText(n);
  }
  function damageText(n) {
    return '$' + compactText(num(n) * 1000000);
  }
  function eruptionCount(rows) {
    return new Set(rows.map(function (row) { return value(row, 'event_id'); }).filter(isPresent).map(String)).size;
  }
  function volcanoCountKey(row) {
    var name = value(row, 'volcano_name');
    if (!isPresent(name) || !String(name).trim()) return '';
    var country = locationValue(row, 'country');
    return [isPresent(country) ? String(country).trim().toLocaleLowerCase() : '', String(name).trim().toLocaleLowerCase()].join('\u0000');
  }
  function buildVolcanoEruptionCounts(rows) {
    var eventIdsByVolcano = Object.create(null);
    rows.forEach(function (row, index) {
      var key = volcanoCountKey(row);
      if (!key) return;
      if (!eventIdsByVolcano[key]) eventIdsByVolcano[key] = Object.create(null);
      var eventId = value(row, 'event_id');
      eventIdsByVolcano[key][isPresent(eventId) ? String(eventId) : 'row-' + index] = true;
    });
    var counts = Object.create(null);
    Object.keys(eventIdsByVolcano).forEach(function (key) {
      counts[key] = Object.keys(eventIdsByVolcano[key]).length;
    });
    return counts;
  }
  function countryCount(rows) {
    var countries = new Set();
    rows.forEach(function (row) {
      var country = locationValue(row, 'country');
      if (isPresent(country) && String(country).trim()) countries.add(String(country).trim().toLocaleLowerCase());
    });
    return countries.size;
  }
  function rowsForState(except) {
    return allRows.filter(function (row) {
      var y = num(value(row, 'year'));
      if (y < yearFloor || y > yearCeiling) return false;
      if (except !== 'year' && state.selectedYear !== '' && y !== Number(state.selectedYear)) return false;
      if (except !== 'country' && !matchesCategory(locationValue(row, 'country'), state.country)) return false;
      if (except !== 'region' && !matchesCategory(locationValue(row, 'country_region'), state.region)) return false;
      if (except !== 'subregion' && !matchesCategory(locationValue(row, 'country_subregion'), state.subregion)) return false;
      if (except !== 'volcanoType' && !matchesCategory(value(row, 'volcano_type'), state.volcanoType)) return false;
      if (except !== 'veiCategory' && !matchesCategory(value(row, 'vei_category'), state.veiCategory)) return false;
      if (except !== 'riskTier' && state.riskTier && !matchesCategory(tierOf(row), state.riskTier)) return false;
      return true;
    });
  }
  function tierOf(row) {
    var tier = value(row, 'vei_risk_tier');
    return isPresent(tier) ? String(tier) : 'Unknown';
  }
  function hasValidMapCoordinates(row) {
    var lat = Number(value(row, 'latitude'));
    var lon = Number(value(row, 'longitude'));
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }
  function rowsWithVisibleMapMarks(rows) {
    return (rows || []).filter(function (row) {
      return hasValidMapCoordinates(row) && (state.show !== 'Deaths' || deathValue(row) > 0);
    });
  }
  function sizeValue(row) {
    if (state.show === 'Deaths') return deathValue(row);
    var v = value(row, 'vei');
    return isPresent(v) && Number.isFinite(Number(v)) ? Math.max(0, Math.min(8, Number(v))) : NaN;
  }
  function transformedSize(valueToTransform) {
    return state.show === 'Deaths'
      ? Math.sqrt(Math.max(0, valueToTransform))
      : Math.pow(Math.max(0, valueToTransform), 1.5);
  }
  function configureMapSizeScale(rows) {
    var field = state.show === 'Deaths' ? 'deaths' : 'vei';
    var values = rowsWithVisibleMapMarks(rows).map(sizeValue).filter(function (v) {
      return Number.isFinite(v) && (field !== 'deaths' || v > 0);
    });
    if (!values.length) {
      mapSizeScale = { field: field, min: 0, max: 0, transformedMin: 0, transformedMax: 0, minRadius: 3.5, maxRadius: 11.5, ready: false };
      return;
    }
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    mapSizeScale = {
      field: field,
      min: min,
      max: max,
      transformedMin: transformedSize(min),
      transformedMax: transformedSize(max),
      minRadius: 3.5,
      maxRadius: 11.5,
      ready: true
    };
  }
  function radiusForMapSize(valueToScale) {
    var v = Number(valueToScale);
    if (!Number.isFinite(v)) return mapSizeScale.minRadius;
    if (state.show !== 'Deaths' && v === 0) return mapSizeScale.minRadius * 0.5;
    if (!mapSizeScale.ready) return mapSizeScale.minRadius;
    var transformed = transformedSize(v);
    var range = mapSizeScale.transformedMax - mapSizeScale.transformedMin;
    if (range <= 0) return (mapSizeScale.minRadius + mapSizeScale.maxRadius) / 2;
    var t = Math.max(0, Math.min(1, (transformed - mapSizeScale.transformedMin) / range));
    return mapSizeScale.minRadius + t * (mapSizeScale.maxRadius - mapSizeScale.minRadius);
  }
  function legendSampleValues(rows) {
    var values = rowsWithVisibleMapMarks(rows).map(sizeValue).filter(function (v) {
      return Number.isFinite(v) && (mapSizeScale.field !== 'deaths' || v > 0);
    }).sort(function (a, b) { return a - b; });
    var distinct = values.filter(function (v, i) { return i === 0 || v !== values[i - 1]; });
    if (!distinct.length) return [];
    var indices = [distinct.length - 1, Math.floor((distinct.length - 1) / 2), 0];
    return indices.map(function (i) { return distinct[i]; }).filter(function (v, i, list) { return list.indexOf(v) === i; });
  }
  function renderMapLegend(rows) {
    if (!legendRoot || !sizeGuide) return;
    rows = rows || rowsForState();
    configureMapSizeScale(rows);
    legendRoot.textContent = '';
    sizeGuide.textContent = '';
    var deathsMode = state.show === 'Deaths';
    legendTitle.textContent = 'COLOR · VEI RISK TIER';
    var presentTiers = Object.create(null);
    rowsWithVisibleMapMarks(rows).forEach(function (row) { presentTiers[tierOf(row)] = true; });
    tierOrder.filter(function (tier) { return presentTiers[tier]; }).forEach(function (tier) {
      var li = el('span', 'legend-item');
      var dot = el('i', 'legend-dot');
      dot.setAttribute('data-tier', tier);
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.backgroundColor = tierColor(tier);
      li.appendChild(dot);
      li.appendChild(el('span', 'legend-label', tier));
      legendRoot.appendChild(li);
    });
    if (!legendRoot.childElementCount) legendRoot.appendChild(el('span', 'legend-empty', 'No categories for current filters'));
    var metricName = deathsMode ? 'REPORTED DEATHS' : 'VEI';
    sizeGuide.appendChild(el('span', 'size-guide-title', 'SIZE · ' + metricName));
    var samplesRoot = el('div', 'size-samples');
    legendSampleValues(rows).forEach(function (amount) {
      var sample = el('span', 'size-sample');
      var dot = el('i', 'legend-dot size-guide-dot');
      var diameter = radiusForMapSize(amount) * 2;
      dot.style.width = diameter + 'px';
      dot.style.height = diameter + 'px';
      sample.appendChild(dot);
      sample.appendChild(el('span', '', deathsMode ? compactText(amount) : 'VEI ' + veiLabel(amount)));
      samplesRoot.appendChild(sample);
    });
    if (!samplesRoot.childElementCount) samplesRoot.appendChild(el('span', 'legend-empty', 'No data for current filters'));
    sizeGuide.appendChild(samplesRoot);
  }
  function veiLabel(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
  function sum(rows, field) {
    return rows.reduce(function (total, row) { return total + num(value(row, field)); }, 0);
  }
  function deathValue(row) {
    return Math.max(num(value(row, 'deaths_total')), num(value(row, 'deaths_direct')));
  }
  function sumDeaths(rows) {
    return rows.reduce(function (total, row) { return total + deathValue(row); }, 0);
  }
  function coverage(rows, field) {
    return rows.filter(function (row) { return isPresent(value(row, field)); }).length;
  }
  function displayDate(row) {
    var raw = value(row, 'eruption_date');
    if (isPresent(raw)) return String(raw).slice(0, 10);
    return String(value(row, 'year') || 'Date unavailable');
  }
  function reportedText(row, field) {
    var v = value(row, field);
    return isPresent(v) ? numberText(v) : 'not reported';
  }
  function select(label, field, stateKey, rows) {
    var wrap = el('label', 'filter');
    wrap.appendChild(el('span', 'filter-label', label));
    var control = el('select', 'filter-select');
    var allOption = el('option', '', 'All');
    allOption.value = '';
    control.appendChild(allOption);
    var seen = Object.create(null);
    var values = [];
    rows.forEach(function (row) {
      var raw = locationValue(row, field);
      if (!isPresent(raw)) return;
      var text = String(raw).trim();
      if (!text || /^all(?:\s|$)/i.test(text)) return;
      var key = text.toLocaleLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      values.push(text);
    });
    values.sort(function (a, b) { return a.localeCompare(b); });
    values.forEach(function (v) {
      var option = el('option', '', v);
      option.value = v;
      control.appendChild(option);
    });
    control._categoryField = field;
    control._stateKey = stateKey;
    control.value = state[stateKey];
    control.addEventListener('change', function () {
      stopYearPlayback();
      state[stateKey] = control.value;
      renderAll();
    });
    wrap.appendChild(control);
    controls[stateKey] = control;
    return wrap;
  }
  function updateFilterOptions() {
    ['region', 'subregion', 'country', 'volcanoType', 'veiCategory', 'riskTier'].forEach(function (stateKey) {
      var control = controls[stateKey];
      if (!control || !control._categoryField) return;
      var available = Object.create(null);
      rowsForState(stateKey).forEach(function (row) {
        var raw = stateKey === 'riskTier' ? tierOf(row) : locationValue(row, control._categoryField);
        if (isPresent(raw)) available[String(raw).trim().toLocaleLowerCase()] = true;
      });
      Array.prototype.forEach.call(control.options, function (option) {
        if (!option.value) {
          option.disabled = false;
          option.removeAttribute('aria-disabled');
          return;
        }
        var enabled = !!available[String(option.value).trim().toLocaleLowerCase()];
        option.disabled = !enabled;
        if (enabled) option.removeAttribute('aria-disabled');
        else option.setAttribute('aria-disabled', 'true');
      });
      control.value = state[stateKey];
    });
  }
  function showSelect() {
    var wrap = el('div', 'header-show');
    var group = el('div', 'show-toggle');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Show chart values');
    controls.showButtons = {};
    ['Eruptions', 'Deaths'].forEach(function (choice) {
      var control = el('button', 'show-button', choice);
      control.type = 'button';
      control.setAttribute('aria-pressed', state.show === choice ? 'true' : 'false');
      control.addEventListener('click', function () {
        stopYearPlayback();
        state.show = choice;
        updateShowButtons();
        centerGlobeOnFilteredPoints();
        startMarkerReveal();
        renderCharts();
      });
      controls.showButtons[choice] = control;
      group.appendChild(control);
    });
    wrap.appendChild(group);
    return wrap;
  }
  function updateShowButtons() {
    if (!controls.showButtons) return;
    Object.keys(controls.showButtons).forEach(function (choice) {
      controls.showButtons[choice].setAttribute('aria-pressed', state.show === choice ? 'true' : 'false');
    });
  }
  function updateYearPlayerButton() {
    if (!yearPlayButton) return;
    var playing = !!yearPlaybackTimer;
    yearPlayButton.textContent = '';
    var icon = svgNode('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' });
    if (playing) {
      icon.appendChild(svgNode('rect', { x: 3, y: 2, width: 3.5, height: 12, rx: 0.7 }));
      icon.appendChild(svgNode('rect', { x: 9.5, y: 2, width: 3.5, height: 12, rx: 0.7 }));
    } else {
      icon.appendChild(svgNode('path', { d: 'M4 2.2v11.6L13.5 8 4 2.2Z' }));
    }
    yearPlayButton.appendChild(icon);
    yearPlayButton.setAttribute('aria-label', playing ? 'Pause year playback' : 'Play years from 1925 to 2024');
    yearPlayButton.setAttribute('title', playing ? 'Pause year playback' : 'Play years from 1925 to 2024');
    yearPlayButton.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function stopYearPlayback() {
    if (yearPlaybackTimer) clearInterval(yearPlaybackTimer);
    yearPlaybackTimer = null;
    updateYearPlayerButton();
  }
  function setSelectedYear(year) {
    var allYears = year === '' || year === null || year === undefined;
    state.selectedYear = allYears ? '' : String(year);
    controls.year.value = allYears ? String(yearCeiling + 1) : state.selectedYear;
    controls.yearValue.textContent = allYears ? 'All years' : state.selectedYear;
    controls.year.setAttribute('aria-valuetext', allYears ? 'All years' : state.selectedYear);
  }
  function playYears() {
    var current = state.selectedYear === '' ? yearFloor : Number(state.selectedYear);
    if (current > yearCeiling) current = yearFloor;
    setSelectedYear(current);
    centerGlobeOnFilteredPoints();
    startMarkerReveal();
    renderAll(false);
    yearPlaybackTimer = setInterval(function () {
      if (Number(state.selectedYear) >= yearCeiling) {
        setSelectedYear('');
        startMarkerReveal();
        renderAll(false);
        stopYearPlayback();
        return;
      }
      var next = Number(state.selectedYear) + 1;
      setSelectedYear(next);
      startMarkerReveal();
      renderAll(false);
    }, 700);
    updateYearPlayerButton();
  }
  function resetFilters() {
    stopYearPlayback();
    state.selectedYear = '';
    state.zoom = 1;
    state.flatPanX = 0;
    state.flatPanY = 0;
    state.rotation = 0;
    state.rotationLat = -12;
    state.region = '';
    state.subregion = '';
    state.country = '';
    state.volcanoType = '';
    state.veiCategory = '';
    state.riskTier = '';
    state.show = 'Eruptions';
    ['region', 'subregion', 'country', 'volcanoType', 'veiCategory', 'riskTier'].forEach(function (key) {
      if (controls[key]) controls[key].value = '';
    });
    updateShowButtons();
    if (controls.year) {
      controls.year.value = String(yearCeiling + 1);
      controls.year.setAttribute('aria-valuetext', 'All years');
    }
    if (controls.yearValue) controls.yearValue.textContent = 'All years';
    renderAll();
  }
  function setupShell() {
    root.textContent = '';
    root.className = 'app-shell theme-' + state.theme;

    var appLayout = el('div', 'app-layout');
    var sidebar = el('aside', 'sidebar');
    var dashboardMain = el('div', 'dashboard-main');
    appLayout.appendChild(sidebar);
    appLayout.appendChild(dashboardMain);
    root.appendChild(appLayout);

    var header = el('header', 'header');
    var titleBlock = el('div', 'title-block');
    titleBlock.appendChild(el('h1', '', 'Volcanic Eruptions'));
    titleBlock.appendChild(el('p', 'subtitle', 'Global activity, eruption power, and reported impacts · 1925–2024'));
    header.appendChild(titleBlock);
    themeSwitch = el('div', 'theme-switch');
    themeSwitch.setAttribute('role', 'group');
    themeSwitch.setAttribute('aria-label', 'Choose color theme');
    themeSwitch.setAttribute('data-theme', state.theme);
    themeSunButton = el('button', 'theme-choice theme-sun');
    themeSunButton.type = 'button';
    themeSunButton.setAttribute('aria-label', 'Switch to light theme');
    themeSunButton.setAttribute('title', 'Light theme');
    themeSunButton.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
    themeSunButton.appendChild(makeThemeIcon('sun'));
    themeMoonButton = el('button', 'theme-choice theme-moon');
    themeMoonButton.type = 'button';
    themeMoonButton.setAttribute('aria-label', 'Switch to dark theme');
    themeMoonButton.setAttribute('title', 'Dark theme');
    themeMoonButton.setAttribute('aria-pressed', state.theme === 'dark' ? 'true' : 'false');
    themeMoonButton.appendChild(makeThemeIcon('moon'));
    themeSunButton.addEventListener('click', function () { applyTheme('light'); });
    themeMoonButton.addEventListener('click', function () { applyTheme('dark'); });
    themeSwitch.appendChild(themeSunButton);
    themeSwitch.appendChild(themeMoonButton);
    var headerActions = el('div', 'header-actions');
    headerActions.appendChild(themeSwitch);
    header.appendChild(headerActions);
    header.appendChild(showSelect());
    dashboardMain.appendChild(header);

    var filterPanel = el('section', 'filter-panel');
    filterPanel.appendChild(select('Region', 'country_region', 'region', allRows));
    filterPanel.appendChild(select('Sub-region', 'country_subregion', 'subregion', allRows));
    filterPanel.appendChild(select('Country', 'country', 'country', allRows));
    filterPanel.appendChild(select('Volcano type', 'volcano_type', 'volcanoType', allRows));
    filterPanel.appendChild(select('VEI risk tier', 'vei_risk_tier', 'riskTier', allRows));
    filterPanel.appendChild(select('VEI category', 'vei_category', 'veiCategory', allRows));
    var resetButton = el('button', 'button reset-filter-button', 'Reset filters');
    resetButton.type = 'button';
    resetButton.setAttribute('title', 'Reset filters to all years and Eruptions');
    resetButton.addEventListener('click', resetFilters);
    filterPanel.appendChild(resetButton);
    sidebar.appendChild(filterPanel);
    var sidebarFooter = el('div', 'sidebar-footer');
    var socialLinks = el('nav', 'sidebar-social-links');
    socialLinks.setAttribute('aria-label', 'Author profiles');
    [
      { icon: 'tableau', href: 'https://public.tableau.com/app/profile/iaroslava/vizzes', aria: 'Open Tableau Public profile in a new tab' },
      { icon: 'github', href: 'https://github.com/IaroslavaMizai', aria: 'Open GitHub profile in a new tab' },
      { icon: 'linkedin', href: 'https://www.linkedin.com/in/iaroslava-mizai-59b02259/', aria: 'Open LinkedIn profile in a new tab' }
    ].forEach(function (profile) {
      var link = el('a', 'sidebar-social-link');
      link.href = profile.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', profile.aria);
        link.addEventListener('click', function (event) {
          event.stopPropagation();
          var opened = window.open(profile.href, '_blank');
          if (opened) {
            event.preventDefault();
            opened.opener = null;
          }
        });
      link.appendChild(socialIcon(profile.icon));
      socialLinks.appendChild(link);
    });
    sidebarFooter.appendChild(socialLinks);
    sidebarFooter.appendChild(el('span', 'sidebar-author', 'Author: Iaroslava Mizai'));
    sidebar.appendChild(sidebarFooter);

    kpiRoot = el('section', 'kpis');
    dashboardMain.appendChild(kpiRoot);

    var main = el('main', 'main-grid');
    var globePanel = el('section', 'panel globe-panel');
    var globeHead = el('div', 'panel-head');
    var titleWrap = el('div', 'panel-title-wrap');
    globeTitle = el('h2', '', 'Eruption locations');
    titleWrap.appendChild(globeTitle);
    globeHead.appendChild(titleWrap);
    var globeActions = el('div', 'globe-actions');
    var spinButton = el('button', 'button spin-button', '⟳ Spin globe');
    spinButton.type = 'button';
    function updateSpinButton() {
      spinButton.textContent = state.spinning ? 'Ⅱ Pause globe' : '⟳ Spin globe';
    }
    spinButton.addEventListener('click', function () {
      state.spinning = !state.spinning;
      updateSpinButton();
      if (spinTimer) clearInterval(spinTimer);
      spinTimer = state.spinning ? setInterval(function () {
        state.rotation -= 0.19;
        drawGlobe();
      }, 32) : null;
    });
    var mapModeButton = el('button', 'button map-mode-button', 'Flat map');
    mapModeButton.type = 'button';
    mapModeButton.setAttribute('title', 'Switch to flat map');
    mapModeButton.setAttribute('aria-label', 'Switch to flat map');
    mapModeButton.setAttribute('aria-pressed', 'false');
    mapModeButton.addEventListener('click', function () {
      state.mapBlend = currentMapBlend();
      state.mapMode = state.mapMode === 'globe' ? 'flat' : 'globe';
      var isFlat = state.mapMode === 'flat';
      if (isFlat) { state.flatPanX = 0; state.flatPanY = 0; }
      spinButton.hidden = isFlat;
      if (isFlat && state.spinning) {
        state.spinning = false;
        if (spinTimer) clearInterval(spinTimer);
        spinTimer = null;
      }
      state.mapTransitionFrom = state.mapBlend;
      state.mapTransitionTo = isFlat ? 1 : 0;
      state.mapTransitionStart = Date.now();
      mapModeButton.textContent = isFlat ? 'Globe' : 'Flat map';
      mapModeButton.setAttribute('title', isFlat ? 'Switch to 3D globe' : 'Switch to flat map');
      mapModeButton.setAttribute('aria-label', isFlat ? 'Switch to 3D globe' : 'Switch to flat map');
      mapModeButton.setAttribute('aria-pressed', isFlat ? 'true' : 'false');
      canvas.setAttribute('aria-label', isFlat
        ? 'Interactive flat map of volcanic eruption locations; drag to pan, scroll to zoom'
        : 'Interactive rotating globe of volcanic eruption locations; drag to rotate, scroll to zoom');
      updateSpinButton();
      drawGlobe();
    });
    globeActions.appendChild(spinButton);
    globeActions.appendChild(mapModeButton);
    globeHead.appendChild(globeActions);
    globePanel.appendChild(globeHead);
    var yearFilter = el('div', 'year-filter');
    var yearFilterHead = el('div', 'year-filter-head');
    yearFilterHead.appendChild(el('span', 'filter-label', 'SELECTED YEAR'));
    controls.yearValue = el('strong', 'year-value', '');
    yearFilterHead.appendChild(controls.yearValue);
    yearFilter.appendChild(yearFilterHead);
    var yearSlider = el('input', 'year-slider');
    yearSlider.type = 'range';
    yearSlider.step = '1';
    yearSlider.setAttribute('aria-label', 'Selected eruption year; filters all dashboard panels');
    yearSlider.addEventListener('input', function () {
      stopYearPlayback();
      state.selectedYear = Number(yearSlider.value) > yearCeiling ? '' : yearSlider.value;
      controls.yearValue.textContent = state.selectedYear || 'All years';
      yearSlider.setAttribute('aria-valuetext', state.selectedYear || 'All years');
      renderAll(false);
    });
    yearSlider.addEventListener('change', function () {
      centerGlobeOnFilteredPoints();
      startMarkerReveal();
      drawGlobe();
    });
    controls.year = yearSlider;
    var yearControlRow = el('div', 'year-control-row');
    yearPlayButton = el('button', 'year-play-button');
    yearPlayButton.type = 'button';
    yearPlayButton.addEventListener('click', function () {
      if (yearPlaybackTimer) stopYearPlayback();
      else playYears();
    });
    updateYearPlayerButton();
    yearControlRow.appendChild(yearPlayButton);
    yearControlRow.appendChild(yearSlider);
    yearFilter.appendChild(yearControlRow);
    var yearEndpoints = el('div', 'year-endpoint-labels');
    yearFilter.appendChild(yearEndpoints);
    globePanel.appendChild(yearFilter);
    var globeWrap = el('div', 'globe-wrap');
    canvas = el('canvas', 'globe');
    canvas.setAttribute('aria-label', 'Interactive rotating globe of volcanic eruption locations; drag to rotate, scroll to zoom');
    tooltip = el('div', 'dashboard-tooltip');
    tooltip.hidden = true;
    globeWrap.appendChild(canvas);
    globeWrap.appendChild(tooltip);
    globePanel.appendChild(globeWrap);
    var legendRow = el('div', 'legend-row');
    var colorLegend = el('div', 'color-legend');
    legendTitle = el('div', 'legend-title', 'VEI RISK TIER');
    colorLegend.appendChild(legendTitle);
    legendRoot = el('div', 'legend');
    colorLegend.appendChild(legendRoot);
    legendRow.appendChild(colorLegend);
    sizeGuide = el('div', 'vei-size-guide');
    legendRow.appendChild(sizeGuide);
    globePanel.appendChild(legendRow);
    renderMapLegend();
    main.appendChild(globePanel);

    var side = el('div', 'sidepanels');
    var trendPanel = el('section', 'panel chart-panel');
    trendTitle = el('h2', '', 'Eruptions over time');
    trendPanel.appendChild(trendTitle);
    trendSubtitle = el('p', 'muted', 'Annual count · selected year highlighted');
    trendPanel.appendChild(trendSubtitle);
    trendRoot = el('div', 'trend-chart');
    trendPanel.appendChild(trendRoot);
    side.appendChild(trendPanel);

    var tierPanel = el('section', 'panel chart-panel');
    tierTitle = el('h2', '', 'Eruptions by VEI risk tier');
    tierPanel.appendChild(tierTitle);
    tierSubtitle = el('p', 'muted', 'Click a category to filter; based on VEI and impact');
    tierPanel.appendChild(tierSubtitle);
    tierRoot = el('div', 'tier-chart');
    tierPanel.appendChild(tierRoot);
    side.appendChild(tierPanel);
    main.appendChild(side);
    dashboardMain.appendChild(main);

    var note = el('p', 'coverage-note');
    note.appendChild(el('strong', '', 'Data note: '));
    note.appendChild(document.createTextNode('VEI = Volcanic Explosivity Index. The index ranks eruptions by explosivity, helping compare the relative strength of different events.'));
    dashboardMain.appendChild(note);
    var footer = el('footer', 'footer');
    var sourceCredit = el('span', 'footer-source');
    sourceCredit.appendChild(document.createTextNode('Source: '));
    var sourceLink = el('a', 'source-link', 'Kaggle dataset ↗');
    sourceLink.href = 'https://www.kaggle.com/datasets/kanchana1990/global-volcano-eruption-intelligence';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.title = 'Open the Global Volcano Eruption Intelligence dataset on Kaggle in a new tab';
    sourceCredit.appendChild(sourceLink);
    footer.appendChild(sourceCredit);
    dashboardMain.appendChild(footer);
  }

  function configureYears() {
    yearFloor = 1925;
    yearCeiling = 2024;
    controls.year.min = String(yearFloor);
    controls.year.max = String(yearCeiling + 1);
    state.selectedYear = '';
    controls.year.value = String(yearCeiling + 1);
    controls.yearValue.textContent = 'All years';
    controls.year.setAttribute('aria-valuetext', 'All years');
  }

  function renderKpis(rows) {
    kpiRoot.textContent = '';
    var cards = [
      { label: 'ERUPTIONS', value: compactText(eruptionCount(rows)), footnote: 'Selected year' },
      { label: 'COUNTRIES', value: compactText(countryCount(rows)), footnote: 'With eruptions' },
      { label: 'DEATHS', direct: 'deaths_direct', total: 'deaths_total', prefix: '' },
      { label: 'INJURIES', direct: 'injuries_direct', total: 'injuries_total', prefix: '' },
      { label: 'MISSING PERSONS', direct: 'missing_persons', total: 'missing_persons_total', prefix: '' },
      { label: 'TOTAL DAMAGE', field: 'damage_total_millions_usd' }
    ];
    cards.forEach(function (card) {
      var box = el('article', 'kpi-card');
      var heading = el('div', 'kpi-heading');
      heading.appendChild(el('span', 'kpi-label', card.label));
      box.appendChild(heading);
      if (card.direct) {
        var primary = el('div', 'kpi-primary');
        primary.appendChild(el('strong', 'kpi-value', compactText(sum(rows, card.direct))));
        primary.appendChild(el('span', 'kpi-primary-note', 'Direct'));
        box.appendChild(primary);
        var total = el('div', 'kpi-secondary');
        total.appendChild(el('span', '', 'Total incl. secondary'));
        total.appendChild(el('strong', '', compactText(sum(rows, card.total))));
        box.appendChild(total);
      } else if (card.field) {
        var damage = sum(rows, card.field);
        var metricPrimary = el('div', 'kpi-primary');
        metricPrimary.appendChild(el('strong', 'kpi-value', damageText(damage)));
        box.appendChild(metricPrimary);
        box.appendChild(el('span', 'kpi-footnote', 'USD · total incl. secondary'));
      } else {
        var metricPrimary = el('div', 'kpi-primary');
        metricPrimary.appendChild(el('strong', 'kpi-value', card.value));
        box.appendChild(metricPrimary);
        box.appendChild(el('span', 'kpi-footnote', card.footnote || ''));
      }
      kpiRoot.appendChild(box);
    });
  }

  function chartBase(width, height) {
    var svg = svgNode('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img' });
    return svg;
  }
  function renderTrend(rows) {
    trendRoot.textContent = '';
    var width = 560, height = 220, left = 46, right = 12, top = 14, bottom = 24;
    var plotW = width - left - right, plotH = height - top - bottom;
    var deathsMode = state.show === 'Deaths';
    var totals = Object.create(null);
    rows.forEach(function (r, rowIndex) {
      var y = num(value(r, 'year'));
      if (!totals[y]) totals[y] = { deaths: 0, eventIds: Object.create(null) };
      totals[y].deaths += deathValue(r);
      var eventId = value(r, 'event_id');
      totals[y].eventIds[isPresent(eventId) ? String(eventId) : 'row-' + rowIndex] = true;
    });
    var years = [];
    for (var y = yearFloor; y <= yearCeiling; y += 1) {
      var yearTotals = totals[y] || { deaths: 0, eventIds: Object.create(null) };
      var eruptions = Object.keys(yearTotals.eventIds).length;
      years.push({ year: y, value: deathsMode ? yearTotals.deaths : eruptions, eruptions: eruptions, deaths: yearTotals.deaths });
    }
    var max = Math.max(1, ...years.map(function (d) { return d.value; }));
    var step = Math.pow(10, Math.floor(Math.log10(max)));
    var tick = Math.max(1, Math.ceil(max / 4 / step) * step);
    var svg = chartBase(width, height);
    for (var g = 0; g <= max; g += tick) {
      var gy = top + plotH - (g / max) * plotH;
      svg.appendChild(svgNode('line', { x1: left, x2: width - right, y1: gy, y2: gy, class: 'chart-grid' }));
      var label = svgNode('text', { x: left - 8, y: gy + 4, class: 'axis-label', 'text-anchor': 'end' });
      label.textContent = compactText(g);
      svg.appendChild(label);
    }
    var pts = years.map(function (d, i) {
      return { x: left + (years.length < 2 ? plotW / 2 : i * plotW / (years.length - 1)), y: top + plotH - (d.value / max) * plotH, year: d.year, value: d.value, eruptions: d.eruptions, deaths: d.deaths };
    });
    if (pts.length) {
      var area = 'M ' + pts[0].x + ' ' + (top + plotH) + ' ' + pts.map(function (p) { return 'L ' + p.x + ' ' + p.y; }).join(' ') + ' L ' + pts[pts.length - 1].x + ' ' + (top + plotH) + ' Z';
      svg.appendChild(svgNode('path', { d: area, class: 'trend-area' }));
      var selectedTrendPoint = state.selectedYear !== ''
        ? pts.find(function (p) { return p.year === Number(state.selectedYear); })
        : null;
      if (selectedTrendPoint) {
        svg.appendChild(svgNode('line', { x1: selectedTrendPoint.x, x2: selectedTrendPoint.x, y1: top, y2: top + plotH, class: 'trend-year-guide', 'aria-hidden': 'true' }));
      }
      svg.appendChild(svgNode('path', { d: pts.map(function (p, i) { return (i ? 'L ' : 'M ') + p.x + ' ' + p.y; }).join(' '), class: 'trend-line' + (deathsMode ? ' trend-line-deaths' : '') }));
      var labelIndices = Array.from(new Set([0, Math.floor((pts.length - 1) / 3), Math.floor((pts.length - 1) * 2 / 3), pts.length - 1]));
      labelIndices.forEach(function (idx) {
        var p = pts[idx];
        var tx = svgNode('text', { x: p.x, y: height - 4, class: 'year-axis-label', 'text-anchor': 'middle' });
        tx.textContent = String(p.year);
        svg.appendChild(tx);
      });
      pts.forEach(function (p) {
        var selected = state.selectedYear !== '' && p.year === Number(state.selectedYear);
        var tooltipTitle = 'Year: ' + p.year;
        var tooltipLines = ['Eruptions: ' + numberText(p.eruptions), 'Deaths: ' + numberText(p.deaths)];
        var dot = svgNode('circle', { cx: p.x, cy: p.y, r: 5, class: 'trend-hit', tabindex: '0', role: 'button', 'aria-label': tooltipTitle + ' · ' + tooltipLines.join(' · ') + '. Click to filter the dashboard to this year.' });
        dot.addEventListener('pointerenter', function (event) { showDashboardTooltip(event, tooltipTitle, tooltipLines); });
        dot.addEventListener('pointermove', function (event) { showDashboardTooltip(event, tooltipTitle, tooltipLines); });
        dot.addEventListener('pointerleave', hideDashboardTooltip);
        dot.addEventListener('focus', function () { showTooltipAtElement(dot, tooltipTitle, tooltipLines); });
        dot.addEventListener('blur', hideDashboardTooltip);
        dot.addEventListener('click', function () {
          stopYearPlayback();
          state.selectedYear = String(p.year);
          controls.year.value = state.selectedYear;
          controls.yearValue.textContent = state.selectedYear;
          controls.year.setAttribute('aria-valuetext', state.selectedYear);
          renderAll();
        });
        dot.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') dot.dispatchEvent(new Event('click')); });
        svg.appendChild(dot);
        if (selected) svg.appendChild(svgNode('circle', { cx: p.x, cy: p.y, r: 5, class: 'trend-selected-point', 'aria-hidden': 'true' }));
      });
    }
    trendRoot.appendChild(svg);
  }
  function renderTiers(rows) {
    tierRoot.textContent = '';
    var deathsMode = state.show === 'Deaths';
    var groupIndex = Object.create(null);
    var groups = [];
    function groupForRow(r, rowIndex, create) {
      var tier = tierOf(r);
      var rawCategory = value(r, 'vei_category');
      var categoryFilter = isPresent(rawCategory) ? String(rawCategory).trim() : '';
      var category = categoryFilter || 'Unknown';
      var rawVei = value(r, 'vei');
      var vei = isPresent(rawVei) && Number.isFinite(Number(rawVei))
        ? Math.max(0, Math.min(8, Number(rawVei)))
        : null;
      var key = [tier.toLocaleLowerCase(), categoryFilter.toLocaleLowerCase(), vei === null ? 'missing' : vei].join('\u0000');
      var group = groupIndex[key];
      if (!group && create) {
        group = {
          tier: tier, category: category, categoryFilter: categoryFilter, vei: vei,
          baselineDeaths: 0, baselineEvents: Object.create(null), deaths: 0, events: Object.create(null)
        };
        groupIndex[key] = group;
        groups.push(group);
      }
      return group;
    }
    function eventKey(r, rowIndex) {
      var eventId = value(r, 'event_id');
      return isPresent(eventId) ? String(eventId) : 'row-' + rowIndex;
    }
    // Keep the profile domain fixed to the dashboard's 1925–2024 data window.
    allRows.forEach(function (r, rowIndex) {
      var group = groupForRow(r, rowIndex, true);
      group.baselineDeaths += deathValue(r);
      group.baselineEvents[eventKey(r, rowIndex)] = true;
    });
    // Active filters and the year slider change values, never the profile list.
    rows.forEach(function (r, rowIndex) {
      var group = groupForRow(r, rowIndex, false);
      if (!group) return;
      group.deaths += deathValue(r);
      group.events[eventKey(r, rowIndex)] = true;
    });
    groups.forEach(function (group) {
      group.value = deathsMode ? group.deaths : Object.keys(group.events).length;
      group.baselineValue = deathsMode ? group.baselineDeaths : Object.keys(group.baselineEvents).length;
    });
    groups.sort(function (a, b) {
      return b.value - a.value || tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) ||
        a.category.localeCompare(b.category) || (a.vei === null ? -1 : a.vei) - (b.vei === null ? -1 : b.vei);
    });
    tierRoot.style.gridTemplateRows = groups.length ? 'repeat(' + groups.length + ', minmax(16px, 1fr))' : '1fr';
    if (!groups.length) {
      tierRoot.appendChild(el('span', 'tier-empty', 'No profiles in 1925–2024'));
      return;
    }
    var max = Math.max(1, ...groups.map(function (group) { return group.value; }));
    groups.forEach(function (group) {
      var selected = state.riskTier === group.tier && state.veiCategory === group.categoryFilter;
      var row = el('button', 'tier-row' + (selected ? ' selected' : ''));
      row.type = 'button';
      row.setAttribute('aria-pressed', selected ? 'true' : 'false');
      var tierName = el('span', 'tier-name');
      var swatch = el('i', 'tier-swatch');
      swatch.style.backgroundColor = tierColor(group.tier);
      tierName.appendChild(swatch);
      tierName.appendChild(el('span', 'tier-label', group.tier));
      row.appendChild(tierName);
      var descriptor = group.category + ' · VEI ' + (group.vei === null ? '—' : veiLabel(group.vei));
      row.appendChild(el('span', 'tier-category', descriptor));
      var track = el('span', 'tier-track');
      var fill = el('i', 'tier-fill');
      fill.style.width = Math.max(0, (group.value / max) * 100) + '%';
      fill.style.backgroundColor = tierColor(group.tier);
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('strong', 'tier-count', numberText(group.value)));
      var tooltipTitle = 'VEI risk tier: ' + group.tier;
      var tooltipLines = [
        'VEI category: ' + group.category,
        'VEI: ' + (group.vei === null ? 'Not reported' : veiLabel(group.vei)),
        'Year: ' + (state.selectedYear || 'All (1925–2024)'),
        'Eruptions: ' + numberText(Object.keys(group.events).length),
        'Deaths: ' + numberText(group.deaths)
      ];
      row.setAttribute('aria-label', [tooltipTitle].concat(tooltipLines).join('. '));
      row.addEventListener('pointerenter', function (event) { showDashboardTooltip(event, tooltipTitle, tooltipLines); });
      row.addEventListener('pointermove', function (event) { showDashboardTooltip(event, tooltipTitle, tooltipLines); });
      row.addEventListener('pointerleave', hideDashboardTooltip);
      row.addEventListener('focus', function () { showTooltipAtElement(row, tooltipTitle, tooltipLines); });
      row.addEventListener('blur', hideDashboardTooltip);
      row.addEventListener('click', function () {
        stopYearPlayback();
        hideDashboardTooltip();
        if (selected) {
          state.riskTier = '';
          state.veiCategory = '';
        } else {
          state.riskTier = group.tier;
          state.veiCategory = group.categoryFilter;
        }
        controls.riskTier.value = state.riskTier;
        controls.veiCategory.value = state.veiCategory;
        renderAll();
      });
      tierRoot.appendChild(row);
    });
  }

  function tierColor(tier) {
    return tierColors[tier] || tierColors.Unknown;
  }
  function makeThemeIcon(kind) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    if (kind === 'sun') {
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '4');
      svg.appendChild(circle);
      [[12,1,12,4],[12,20,12,23],[1,12,4,12],[20,12,23,12],[4.2,4.2,6.3,6.3],[17.7,17.7,19.8,19.8],[17.7,6.3,19.8,4.2],[4.2,19.8,6.3,17.7]].forEach(function (line) {
        var ray = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ray.setAttribute('x1', line[0]); ray.setAttribute('y1', line[1]);
        ray.setAttribute('x2', line[2]); ray.setAttribute('y2', line[3]);
        svg.appendChild(ray);
      });
    } else {
      var moon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      moon.setAttribute('d', 'M19.3 15.5A8.2 8.2 0 0 1 8.5 4.7a8.5 8.5 0 1 0 10.8 10.8Z');
      svg.appendChild(moon);
    }
    return svg;
  }
  function applyTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    if (root) root.className = 'app-shell theme-' + state.theme;
    document.documentElement.setAttribute('data-theme', state.theme);
    document.body.setAttribute('data-theme', state.theme);
    if (themeSwitch) {
      themeSwitch.setAttribute('data-theme', state.theme);
      themeSunButton.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
      themeMoonButton.setAttribute('aria-pressed', state.theme === 'dark' ? 'true' : 'false');
    }
    try { window.localStorage.setItem('volcanic-eruptions-theme', state.theme); } catch (e) {}
    if (legendRoot) {
      Array.prototype.forEach.call(legendRoot.querySelectorAll('[data-tier]'), function (dot) {
        dot.style.backgroundColor = tierColor(dot.getAttribute('data-tier'));
      });
    }
    if (allRows.length && kpiRoot) renderAll();
  }
  function centerGlobeOnFilteredPoints() {
    var x = 0, y = 0, z = 0, count = 0, first = null;
    rowsForState().forEach(function (row) {
      if (state.show === 'Deaths' && deathValue(row) <= 0) return;
      var lat = Number(value(row, 'latitude'));
      var lon = Number(value(row, 'longitude'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
      if (!first) first = [lon, lat];
      var phi = lat * Math.PI / 180;
      var lambda = lon * Math.PI / 180;
      x += Math.cos(phi) * Math.cos(lambda);
      y += Math.cos(phi) * Math.sin(lambda);
      z += Math.sin(phi);
      count += 1;
    });
    if (!count) return;
    var horizontal = Math.hypot(x, y);
    var lonCenter = horizontal < 1e-8 ? first[0] : Math.atan2(y, x) * 180 / Math.PI;
    var latCenter = horizontal < 1e-8 && Math.abs(z) < 1e-8
      ? first[1]
      : Math.atan2(z, horizontal) * 180 / Math.PI;
    state.rotation = -lonCenter;
    state.rotationLat = Math.max(-70, Math.min(70, -latCenter));
  }
  function startMarkerReveal() {
    state.markerRevealStart = Date.now();
  }
  function currentMapBlend() {
    if (!state.mapTransitionStart) return state.mapBlend;
    var progress = Math.min(1, (Date.now() - state.mapTransitionStart) / 900);
    if (progress >= 1) {
      state.mapBlend = state.mapTransitionTo;
      state.mapTransitionStart = 0;
      return state.mapBlend;
    }
    var eased = progress * progress * (3 - 2 * progress);
    return state.mapTransitionFrom + (state.mapTransitionTo - state.mapTransitionFrom) * eased;
  }
  function drawGlobe() {
    if (!canvas || !window.UCDP_D3_GEO || !window.UCDP_WORLD_GEOJSON) return;
    var bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var width = bounds.width, height = bounds.height, cx = width / 2, cy = height / 2;
    var radius = Math.min(width * 0.43, height * 0.47) * state.zoom;
    var blend = currentMapBlend();
    var maxFlatLat = Math.PI / 2;
    var flatScale = Math.min(width / (2 * Math.PI) * 0.99, height / Math.PI * 0.98) * state.zoom;
    var flatTranslate = [cx + state.flatPanX * blend, cy + state.flatPanY * blend];
    var morphRotation = [state.rotation * (1 - blend), state.rotationLat * (1 - blend), 0];
    var geo = window.UCDP_D3_GEO;
    ctx.clearRect(0, 0, width, height);
    var light = state.theme === 'light';
    var projection;
    if (blend <= 0) {
      projection = geo.geoOrthographic().translate([cx, cy]).scale(radius)
        .rotate([state.rotation, state.rotationLat, 0]).clipAngle(90);
    } else if (blend >= 1) {
      projection = geo.geoEquirectangular().translate(flatTranslate).scale(flatScale)
        .clipExtent([[0, 0], [width, height]]);
    } else {
      var morphRaw = function (lambda, phi) {
        var globePoint = geo.geoOrthographicRaw(lambda, phi);
        var flatPhi = Math.max(-maxFlatLat, Math.min(maxFlatLat, phi));
        var flatPoint = geo.geoEquirectangularRaw(lambda, flatPhi);
        return [
          globePoint[0] * radius * (1 - blend) + flatPoint[0] * flatScale * blend,
          globePoint[1] * radius * (1 - blend) + flatPoint[1] * flatScale * blend
        ];
      };
      projection = geo.geoProjection(morphRaw).scale(1).translate(flatTranslate)
        .rotate(morphRotation)
        .clipAngle(90 + 89.999 * blend);
    }
    var rotatePoint = window.UCDP_D3_GEO.geoRotation(projection.rotate());
    var path = window.UCDP_D3_GEO.geoPath(projection, ctx);
    ctx.beginPath(); path({ type: 'Sphere' });
    var gradientRadius = radius + (Math.hypot(width / 2, height / 2) - radius) * blend;
    var gradient = ctx.createRadialGradient(cx - gradientRadius * 0.28, cy - gradientRadius * 0.3, gradientRadius * 0.08, cx, cy, gradientRadius);
    gradient.addColorStop(0, light ? '#f5f9fd' : '#173750');
    gradient.addColorStop(1, light ? '#bfd3e5' : '#071522');
    ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); path(window.UCDP_WORLD_GEOJSON);
    ctx.fillStyle = light ? '#a9c4db' : '#31516a'; ctx.fill('evenodd');
    ctx.strokeStyle = light ? 'rgba(65,99,127,.34)' : 'rgba(188,210,224,.22)'; ctx.lineWidth = 0.45; ctx.stroke();
    if (blend < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - blend;
      ctx.beginPath(); path(window.UCDP_D3_GEO.geoGraticule10());
      ctx.strokeStyle = light ? 'rgba(68,105,136,.23)' : 'rgba(163,193,214,.20)'; ctx.lineWidth = 0.55; ctx.stroke();
      ctx.restore();
    }

    var points = [];
    var revealProgress = state.markerRevealStart
      ? Math.min(1, (Date.now() - state.markerRevealStart) / 520)
      : 1;
    var revealEase = 1 - Math.pow(1 - revealProgress, 3);
    rowsForState().forEach(function (row) {
      var deaths = deathValue(row);
      if (state.show === 'Deaths' && deaths <= 0) return;
      var lat = Number(value(row, 'latitude')), lon = Number(value(row, 'longitude'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
      var rotated = rotatePoint([lon, lat]);
      if (!rotated) return;
      var latRadians = rotated[1] * Math.PI / 180;
      var lonRadians = rotated[0] * Math.PI / 180;
      var frontness = Math.cos(latRadians) * Math.cos(lonRadians);
      var angularDistance = Math.acos(Math.max(-1, Math.min(1, frontness))) * 180 / Math.PI;
      var clipAngle = 90 + 89.999 * blend;
      if (blend < 1 && angularDistance > clipAngle) return;
      var horizonProgress = blend >= 1 ? 1 : Math.max(0, Math.min(1, (clipAngle - angularDistance) / 10));
      var horizonEase = horizonProgress * horizonProgress * (3 - 2 * horizonProgress);
      var point = projection([lon, lat]);
      if (!point) return;
      var baseRadius = radiusForMapSize(sizeValue(row));
      var scale = 0.62 + 0.38 * revealEase;
      points.push({ row: row, x: point[0], y: point[1], radius: baseRadius * scale, opacity: horizonEase * revealEase, tier: tierOf(row) });
    });
    points.sort(function (a, b) { return a.radius - b.radius; });
    points.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = tierColor(p.tier); ctx.globalAlpha = 0.88 * p.opacity; ctx.fill();
      ctx.strokeStyle = light ? 'rgba(242,248,252,.88)' : 'rgba(70,103,127,.68)'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
    });
    if (blend < 1) {
      ctx.beginPath(); path({ type: 'Sphere' });
      ctx.strokeStyle = light ? 'rgba(75,113,145,.48)' : 'rgba(172,202,220,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
    }
    state.mapPoints = points;
    state.projection = projection;
    if ((revealProgress < 1 || state.mapTransitionStart) && !state.markerAnimationFrame && window.requestAnimationFrame) {
      state.markerAnimationFrame = window.requestAnimationFrame(function () {
        state.markerAnimationFrame = 0;
        drawGlobe();
      });
    } else if (revealProgress >= 1) state.markerRevealStart = 0;
  }
  function showDashboardTooltip(event, title, lines) {
    if (!tooltip) return;
    tooltip.textContent = '';
    tooltip.appendChild(el('strong', '', title));
    (lines || []).forEach(function (line) { tooltip.appendChild(el('span', '', line)); });
    tooltip.hidden = false;
    var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    var viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    var left = event.clientX + 12;
    var top = event.clientY + 12;
    if (left + tooltip.offsetWidth > viewportWidth - 8) left = event.clientX - tooltip.offsetWidth - 12;
    if (top + tooltip.offsetHeight > viewportHeight - 8) top = event.clientY - tooltip.offsetHeight - 12;
    tooltip.style.left = Math.max(8, left) + 'px';
    tooltip.style.top = Math.max(8, top) + 'px';
  }
  function hideDashboardTooltip() {
    if (tooltip) tooltip.hidden = true;
  }
  function showTooltipAtElement(target, title, lines) {
    var rect = target.getBoundingClientRect();
    showDashboardTooltip({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, title, lines);
  }
  function showTooltip(event) {
    if (state.dragging || !state.mapPoints.length) { hideDashboardTooltip(); return; }
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left, y = event.clientY - rect.top;
    var nearest = null, distance = 15;
    state.mapPoints.forEach(function (point) {
      var d = Math.hypot(point.x - x, point.y - y);
      if (d <= distance + point.radius) { nearest = point; distance = d - point.radius; }
    });
    if (!nearest) { hideDashboardTooltip(); return; }
    var row = nearest.row;
    function tooltipValue(raw) {
      return isPresent(raw) && String(raw).trim() ? String(raw).trim() : 'Not reported';
    }
    var rawVei = value(row, 'vei');
    var vei = isPresent(rawVei) && Number.isFinite(Number(rawVei)) ? veiLabel(Number(rawVei)) : 'Not reported';
    var rawDeaths = isPresent(value(row, 'deaths_direct')) || isPresent(value(row, 'deaths_total'))
      ? numberText(deathValue(row))
      : 'Not reported';
    var key = volcanoCountKey(row);
    var eruptionTotal = key && volcanoEruptionCounts[key] ? volcanoEruptionCounts[key] : 1;
    var lines = [
      'Country: ' + tooltipValue(locationValue(row, 'country')),
      'Region: ' + tooltipValue(locationValue(row, 'country_region')),
      'Year: ' + tooltipValue(value(row, 'year')),
      'VEI category: ' + tooltipValue(value(row, 'vei_category')),
      'VEI risk tier: ' + tierOf(row),
      'VEI: ' + vei,
      'Eruptions: ' + numberText(eruptionTotal),
      'Deaths: ' + rawDeaths
    ];
    showDashboardTooltip(event, 'Volcano: ' + tooltipValue(value(row, 'volcano_name')), lines);
  }
  function setupGlobe() {
    var drag = null;
    canvas.addEventListener('pointerdown', function (event) {
      drag = { x: event.clientX, y: event.clientY, rotation: state.rotation, lat: state.rotationLat, panX: state.flatPanX, panY: state.flatPanY };
      state.dragging = true;
      canvas.setPointerCapture(event.pointerId);
      tooltip.hidden = true;
    });
    canvas.addEventListener('pointermove', function (event) {
      if (drag) {
        if (currentMapBlend() >= 0.5) {
          state.flatPanX = drag.panX + (event.clientX - drag.x);
          state.flatPanY = drag.panY + (event.clientY - drag.y);
        } else {
          state.rotation = drag.rotation + (event.clientX - drag.x) * 0.35;
          state.rotationLat = Math.max(-70, Math.min(70, drag.lat - (event.clientY - drag.y) * 0.22));
        }
        drawGlobe();
      } else showTooltip(event);
    });
    canvas.addEventListener('pointerleave', function () { if (!state.dragging) hideDashboardTooltip(); });
    function stopDrag() { drag = null; state.dragging = false; }
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      var maxZoom = currentMapBlend() >= 0.5 ? 2.5 : 1.55;
      state.zoom = Math.max(0.85, Math.min(maxZoom, state.zoom + (event.deltaY < 0 ? 0.08 : -0.08)));
      drawGlobe();
    }, { passive: false });
    if (window.ResizeObserver) new ResizeObserver(drawGlobe).observe(canvas);
    window.addEventListener('resize', drawGlobe);
  }

  function renderCharts() {
    hideDashboardTooltip();
    var rows = rowsForState();
    var deathsMode = state.show === 'Deaths';
    globeTitle.textContent = deathsMode ? 'Deaths by location' : 'Eruption locations';
    trendTitle.textContent = deathsMode ? 'Deaths over time' : 'Eruptions over time';
    trendSubtitle.textContent = state.selectedYear === ''
      ? (deathsMode ? 'Reported deaths · all years' : 'Annual count · all years')
      : (deathsMode ? 'Reported deaths · selected year highlighted' : 'Annual count · selected year highlighted');
    tierTitle.textContent = deathsMode ? 'Deaths by VEI profile' : 'Eruptions by VEI profile';
    tierSubtitle.textContent = deathsMode ? 'Reported deaths · zero-result profiles remain visible' : 'Eruption count · zero-result profiles remain visible';
    renderMapLegend(rows);
    renderTrend(rowsForState('year'));
    renderTiers(rows);
    drawGlobe();
  }
  function renderAll(recenter) {
    updateFilterOptions();
    if (recenter !== false) {
      centerGlobeOnFilteredPoints();
      startMarkerReveal();
    }
    renderKpis(rowsForState());
    renderCharts();
  }
  function renderError(message) {
    root.textContent = '';
    var panel = el('section', 'error-card');
    panel.appendChild(el('h1', '', 'Volcanic Eruptions'));
    panel.appendChild(el('p', '', 'Dashboard could not start: ' + message));
    root.appendChild(panel);
  }
  function boot() {
    fetch('./data.json').then(function (response) {
      if (!response.ok) throw new Error('Could not load the bundled eruption data (' + response.status + ').');
      return response.json();
    }).then(function (payload) {
      allRows = rowsOf(payload).filter(function (row) {
        var year = num(value(row, 'year'));
        return year >= yearFloor && year <= yearCeiling;
      });
      if (!allRows.length) throw new Error('No eruption records were found for 1925–2024.');
      volcanoEruptionCounts = buildVolcanoEruptionCounts(allRows);
      if (!window.UCDP_D3_GEO || typeof window.UCDP_D3_GEO.geoOrthographic !== 'function') {
        throw new Error('the local globe projection library did not initialize');
      }
      try {
        var savedTheme = window.localStorage.getItem('volcanic-eruptions-theme');
        if (savedTheme === 'light' || savedTheme === 'dark') state.theme = savedTheme;
      } catch (e) {}
      document.documentElement.setAttribute('data-theme', state.theme);
      document.body.setAttribute('data-theme', state.theme);
      setupShell();
      configureYears();
      setupGlobe();
      renderAll();
    }).catch(function (err) {
      renderError((err && (err.message || err.errorCode)) || String(err));
    });
  }

  boot();
})();
