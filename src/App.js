import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [data, setData] = useState([]);
  const [cols, setCols] = useState([]);
  const [active, setActive] = useState(null);

  const [calcMode, setCalcMode] = useState("column");

  const [copiedRow, setCopiedRow] = useState(null);
  const [copiedCol, setCopiedCol] = useState(null);

  // arithmetic operation inputs
  const [targetType, setTargetType] = useState("column");
  const [targetIndex, setTargetIndex] = useState("");
  const [op, setOp] = useState("+");
  const [opValue, setOpValue] = useState("");

  const colName = (i) => String.fromCharCode(65 + i);

  /* ===== INITIAL 10x10 TABLE ===== */
  useEffect(() => {
    const colArr = [];
    for (let i = 0; i < 10; i++) colArr.push(colName(i));
    setCols(colArr);

    const table = [];
    for (let r = 0; r < 10; r++) {
      const row = [];
      for (let c = 0; c < 10; c++) {
        row.push({
          value: "",
          bold: false,
          italic: false,
          bg: "",
          formula: null,
        });
      }
      table.push(row);
    }
    setData(table);
  }, []);

  /* ===== RECALCULATE FORMULAS (FIXED SUM & AVG) ===== */
  const recalc = (table) => {
    const copy = JSON.parse(JSON.stringify(table));

    for (let r = 0; r < copy.length; r++) {
      for (let c = 0; c < copy[r].length; c++) {
        const cell = copy[r][c];
        if (!cell.formula) continue;

        let total = 0;
        let count = 0;

        if (cell.formula.mode === "column") {
          for (let i = 0; i < copy.length; i++) {
            if (i === r) continue; // self skip
            const raw = copy[i][cell.formula.index].value;

            if (raw !== "" && !isNaN(raw)) {
              total += parseFloat(raw);
              count++;
            }
          }
        } else {
          for (let i = 0; i < copy[cell.formula.index].length; i++) {
            if (i === c) continue;
            const raw = copy[cell.formula.index][i].value;

            if (raw !== "" && !isNaN(raw)) {
              total += parseFloat(raw);
              count++;
            }
          }
        }

        if (cell.formula.type === "sum") {
          cell.value = count > 0 ? total : "";
        } else {
          cell.value = count > 0 ? (total / count).toFixed(2) : "";
        }
      }
    }
    return copy;
  };

  /* ===== UPDATE CELL ===== */
  const updateCell = (r, c, value) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy[r][c].value = value;
    copy[r][c].formula = null;
    setData(recalc(copy));
  };

  /* ===== STYLING ===== */
  const toggleStyle = (key) => {
    if (!active) return;
    const copy = JSON.parse(JSON.stringify(data));
    copy[active.r][active.c][key] = !copy[active.r][active.c][key];
    setData(copy);
  };

  const changeBg = () => {
    if (!active) return;
    const color = prompt("Enter background color");
    if (!color) return;
    const copy = JSON.parse(JSON.stringify(data));
    copy[active.r][active.c].bg = color;
    setData(copy);
  };

  /* ===== ADD ROW / COLUMN ===== */
  const addRow = () => {
    const row = [];
    for (let i = 0; i < cols.length; i++) {
      row.push({
        value: "",
        bold: false,
        italic: false,
        bg: "",
        formula: null,
      });
    }
    setData([...data, row]);
  };

  const addColumn = () => {
    setCols([...cols, colName(cols.length)]);
    const copy = JSON.parse(JSON.stringify(data));
    for (let r = 0; r < copy.length; r++) {
      copy[r].push({
        value: "",
        bold: false,
        italic: false,
        bg: "",
        formula: null,
      });
    }
    setData(copy);
  };

  /* ===== COPY / PASTE ===== */
  const copyRow = () => {
    if (!active) return;
    setCopiedRow(JSON.parse(JSON.stringify(data[active.r])));
  };

  const pasteRow = () => {
    if (!active || !copiedRow) return;
    const copy = JSON.parse(JSON.stringify(data));
    copy[active.r] = JSON.parse(JSON.stringify(copiedRow));
    setData(copy);
  };

  const copyCol = () => {
    if (!active) return;
    const col = data.map((row) => row[active.c]);
    setCopiedCol(JSON.parse(JSON.stringify(col)));
  };

  const pasteCol = () => {
    if (!active || !copiedCol) return;
    const copy = JSON.parse(JSON.stringify(data));
    for (let i = 0; i < copy.length; i++) {
      copy[i][active.c] = JSON.parse(JSON.stringify(copiedCol[i]));
    }
    setData(copy);
  };

  /* ===== SUM / AVG ===== */
  const calculate = (type) => {
    if (!active) return;
    const copy = JSON.parse(JSON.stringify(data));
    copy[active.r][active.c].formula = {
      type,
      mode: calcMode,
      index: calcMode === "column" ? active.c : active.r,
    };
    setData(recalc(copy));
  };

  /* ===== ARITHMETIC OPERATION ===== */
  const applyOperation = () => {
    const num = Number(opValue);
    if (isNaN(num)) return;

    const copy = JSON.parse(JSON.stringify(data));

    for (let r = 0; r < copy.length; r++) {
      for (let c = 0; c < copy[r].length; c++) {
        const match =
          targetType === "row"
            ? r === Number(targetIndex) - 1
            : c === targetIndex.toUpperCase().charCodeAt(0) - 65;

        if (!match) continue;

        const v = Number(copy[r][c].value);
        if (isNaN(v)) continue;

        if (op === "+") copy[r][c].value = v + num;
        if (op === "-") copy[r][c].value = v - num;
        if (op === "*") copy[r][c].value = v * num;
        if (op === "/" && num !== 0) copy[r][c].value = v / num;
      }
    }
    setData(recalc(copy));
  };

  /* ===== SAVE / LOAD JSON ===== */
  const saveJSON = () => {
    const blob = new Blob([JSON.stringify({ cols, data }, null, 2)]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spreadsheet.json";
    a.click();
  };

  const loadJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = JSON.parse(ev.target.result);
      setCols(parsed.cols);
      setData(parsed.data);
      setActive(null);
    };
    reader.readAsText(file);
  };

  /* ===== UI ===== */
  return (
    <>
      <button onClick={() => toggleStyle("bold")}>Bold</button>
      <button onClick={() => toggleStyle("italic")}>Italic</button>
      <button onClick={changeBg}>Background</button>

      <button onClick={addRow}>Add Row</button>
      <button onClick={addColumn}>Add Column</button>
      <button onClick={copyRow}>Copy Row</button>
      <button onClick={pasteRow}>Paste Row</button>
      <button onClick={copyCol}>Copy Column</button>
      <button onClick={pasteCol}>Paste Column</button>

      <select onChange={(e) => setCalcMode(e.target.value)}>
        <option value="column">Column</option>
        <option value="row">Row</option>
      </select>
      <button onClick={() => calculate("sum")}>SUM</button>
      <button onClick={() => calculate("avg")}>AVG</button>

      <select onChange={(e) => setTargetType(e.target.value)}>
        <option value="column">Column</option>
        <option value="row">Row</option>
      </select>
      <input
        placeholder="Index"
        onChange={(e) => setTargetIndex(e.target.value)}
      />
      <select onChange={(e) => setOp(e.target.value)}>
        <option value="+">+</option>
        <option value="-">-</option>
        <option value=""></option>
        <option value="/">/</option>
      </select>
      <input placeholder="Value" onChange={(e) => setOpValue(e.target.value)} />
      <button onClick={applyOperation}>Apply</button>

      <button onClick={saveJSON}>Save JSON</button>
      <input type="file" accept=".json" onChange={loadJSON} />

      <table border="1">
        <thead>
          <tr>
            <th>#</th>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, r) => (
            <tr key={r}>
              <td>{r + 1}</td>
              {row.map((cell, c) => (
                <td key={c} style={{ backgroundColor: cell.bg }}>
                  <input
                    value={cell.value}
                    onClick={() => setActive({ r, c })}
                    onChange={(e) => updateCell(r, c, e.target.value)}
                    style={{
                      width: "80px",
                      border: "0.3px solid black",
                      outline: "0.3px solid black",
                      backgroundColor: "transparent",
                      fontWeight: cell.bold ? "bold" : "normal",
                      fontStyle: cell.italic ? "italic" : "normal",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
