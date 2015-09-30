String.prototype.format = function() {
  var self = this;
  var i = arguments.length;

  while (i--) {
    self = self.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
  }
  return self;
};

/**
 * @constructor for LCSLengths
 * @param {Int} m
 * @param {Int} n
 */
function LCSLengths(m, n) {
  var self = this;
  self.m_ = m;
  self.n_ = n;
  self.vector_ =
    Array.apply(null, Array(m * n)).map(Number.prototype.valueOf, 0);
  return self;
}

/**
 * Get the value
 * @param {Int} i
 * @param {Int} j
 * @return {Int} the value at the specified index
 */
LCSLengths.prototype.value = function value(i, j) {
  var self = this;
  var index = i * self.n_ + j;
  if (index > self.vector_.length || i >= self.m_ || j >= self.n_) {
    return 0;
  } else {
    return self.vector_[index];
  }
};

/**
 * Set the value
 * @param {Int} i
 * @param {Int} j
 * @param {Int} value
 */
LCSLengths.prototype.setValue = function setValue(i, j, value) {
  var self = this;
  var index = i * self.n_ + j;
  if (index > self.vector_.length || i >= self.m_ || j >= self.n_) {
    return;
  }

  self.vector_[index] = value;
};

/**
 * Print the lengths
 */
LCSLengths.prototype.print = function print() {
  var self = this;
  for (j = 0; j <= self.n_; ++j) {
    for (i = 0; i <= self.m_; ++i) {
      var out = '{0} ';
      out = out.format(self.value(i, j));
      process.stdout.write(out);
      if (i == self.m_) {
        process.stdout.write('\n');
      }
    }
  }
};

function HunkRange() {
  var self = this;
  self.plusL = 0;
  self.plusS = 0;
  self.minusL = 0;
  self.minusS = 0;
}

var Type = {
  Context: 0,
  Minus: 1,
  Plus: 2,
  Hunk: 3
};

function DiffLine() {
  var self = this;
  self.type = Type.Context;
  self.indexA = 0;
  self.indexB = 0;
  self.line = '';
}

function makeHunk() {
  var hunk = new DiffLine();
  hunk.type = Type.Hunk;
  hunk.indexA = -1;
  hunk.indexB = -1;
  hunk.line = '@@ -{0},{1} +{2},{3} @@';
  return hunk;
}

/**
 * Unified diff method using Longest Common Subsequence algorithm
 * @param {String} a
 * @param {String} b
 * @return {String} the unified diff of a and b
 */
function Diff(a, b) {
  var aLines = a.split('\n');
  var bLines = b.split('\n');

  while (aLines.length && bLines.length && aLines[0] == bLines[0]) {
    aLines.shift();
    bLines.shift();
  }

  while (aLines.length && bLines.length &&
    aLines[aLines.length - 1] == bLines[bLines.length - 1]) {
    aLines.pop();
    bLines.pop();
  }

  var aSize = aLines.length;
  var bSize = bLines.length;

  var lengths = new LCSLengths(aSize, bSize);

  for (i = aSize - 1; i >= 0; i--) {
    for (j = bSize - 1; j >= 0; j--) {
      if (aLines[i] == bLines[j]) {
        lengths.setValue(i, j, 1 + lengths.value(i + 1, j + 1));
      } else {
        var max = Math.max(lengths.value(i + 1, j),
                            lengths.value(i, j + 1));
        lengths.setValue(i, j, max);
      }
    }
  }

  var lines = [];
  var i = 0;
  var j = 0;
  while (i < aSize || j < bSize) {
    var line = new DiffLine();
    var exhaustedA = i >= aSize;
    var exhaustedB = j >= bSize;
    var a = !exhaustedA ? aLines[i] : '';
    var b = !exhaustedB ? bLines[j] : '';
    if (!exhaustedA && !exhaustedB && a == b) {
      line.type = Type.Context;
      line.indexA = i;
      line.indexB = j;
      line.line = ' ' + a;
      i++; j++;
    } else if (!exhaustedA &&
      lengths.value(i + 1, j) >= lengths.value(i, j + 1)) {
      line.type = Type.Minus;
      line.indexA = i;
      line.indexB = -1;
      line.line = '-' + a;
      i++;
    } else if (!exhaustedB) {
      line.type = Type.Plus;
      line.indexA = -1;
      line.indexB = j;
      line.line = '+' + b;
      j++;
    }
    lines.push(line);
  }

  lines.splice(0, 0, makeHunk());

  var contextCount = 0;
  for (i = 0; i < lines.length; ++i) {
    var line = lines[i];

    if (line.type == Type.Context)
        contextCount++;
    else
        contextCount = 0;

    if (contextCount == 6)
        lines.splice(i - 2, 0, makeHunk());

    if (contextCount > 6)
        lines.splice(i - 2, 1);
  }

  var ranges = [];
  var minusStart = 0;
  var minusRange = 0;
  var plusStart = 0;
  var plusRange = 0;
  for (i = 1; i < lines.length; ++i) {
    var line = lines[i];

    switch (line.type)
    {
    case Type.Hunk:
      var range = new HunkRange();
      range.minusL = minusStart;
      range.minusS = minusRange;
      range.plusL = plusStart;
      range.plusS = plusRange;
      ranges.push(range);
      minusStart = 0;
      minusRange = 0;
      plusStart = 0;
      plusRange = 0;
      break;
    case Type.Context:
      plusRange++;
      minusRange++;
      if (!minusStart) minusStart = line.indexA + 1;
      if (!plusStart) plusStart = line.indexB + 1;
      break;
    case Type.Minus:
      minusRange++;
      if (!minusStart) minusStart = line.indexA + 1;
      break;
    case Type.Plus:
      plusRange++;
      if (!plusStart) plusStart = line.indexB + 1;
      break;
    default:
      break;
    }
  }

  var range = new HunkRange();
  range.minusL = minusStart;
  range.minusS = minusRange;
  range.plusL = plusStart;
  range.plusS = plusRange;
  ranges.push(range);

  var diff = '';

  diff = diff.concat('--- original\n');
  diff = diff.concat('+++ modified\n');

  for (i = 0; i < lines.length; ++i) {
    var line = lines[i];

    if (line.type == Type.Hunk) {
      var range = ranges.shift();
      var hunk = line.line;
      line.line = hunk.format(range.minusL,
                              range.minusS,
                              range.plusL,
                              range.plusS);
    }

    diff = diff.concat(line.line + '\n');
  }

  return diff;
}

module.exports = {
  diff: Diff
};
