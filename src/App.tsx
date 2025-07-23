import { useState, useRef, useEffect, useCallback } from "react";
// import { twMerge } from "tailwind-merge";

type wordProbability = {
  word: string;
  number: number;
};

type NextWord = {
  word: string;
  nextWordNumber: number;
  nextWord: wordProbability[];
};

type History = {
  text: string;
  user: boolean;
};

const App = () => {
  const [inputText, setInputText] = useState("");
  const [nextWord, setNextWord] = useState<NextWord[]>([]);
  const [firstWord, setFirstWord] = useState<wordProbability[]>([]);
  const [firstWordNumber, setFirstWordNumber] = useState(0);
  // const [sentense, setSentense] = useState("");
  const [history, setHistory] = useState<History[]>([]);
  const [isNotLearning, setIsNotLearning] = useState(false);
  const [isNotReply, setIsNotReply] = useState(false);
  const [chatOrView, setChatOrView] = useState<"chat" | "view">("chat");
  const [entireX, setEntireX] = useState(0);
  const [entireY, setEntireY] = useState(0);
  // const [viewWord, setViewWord] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wordPosition: { x: number; y: number; r: number }[] = [];
    const wordOrder: string[] = [];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawArc = (x: number, y: number, r: number, c: string) => {
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    };

    const drawText = (x: number, y: number, text: string) => {
      ctx.fillStyle = "#000";
      ctx.fillText(text, x, y);
    };

    firstWord.forEach((item, i) => {
      const basicsX = 40 + i * 107 - entireX;
      const basicsY = 40 + entireY;
      const r = Math.max(5 + item.word.length * 5, 20);
      wordPosition.push({ x: basicsX, y: basicsY, r: r });
      wordOrder.push(item.word);

      drawArc(basicsX, basicsY, r, "#e0f2fe");
      drawText(basicsX - item.word.length * 5, basicsY + 5, item.word);
    });

    let nextWordInFirstWordNum = 0;
    if (firstWord.length != 0 && nextWord.length == firstWord.length) {
      const basicsX = 93 + -entireX;
      const basicsY = 147 + entireY;
      wordPosition.push({ x: basicsX, y: basicsY, r: 20 });
      wordOrder.push("");

      drawArc(basicsX, basicsY, 20, "#fee2e2");
    }
    nextWord.forEach((item, i) => {
      if (firstWord.some((fw) => fw.word === item.word)) {
        nextWordInFirstWordNum++;
        return;
      }
      const numPerRow = Math.max(firstWord.length - 1, 5);
      const basicsX =
        93 + ((i - nextWordInFirstWordNum) % numPerRow) * 107 - entireX;
      const basicsY =
        147 +
        Math.floor((i - nextWordInFirstWordNum) / numPerRow) * 107 +
        entireY;
      const r = Math.max(5 + item.word.length * 5, 20);
      wordPosition.push({ x: basicsX, y: basicsY, r: r });
      wordOrder.push(item.word);

      drawArc(basicsX, basicsY, r, "#e0e7ff");
      drawText(basicsX - item.word.length * 5, basicsY + 5, item.word);

      if (i == nextWord.length - 1) {
        i++;
        const basicsX =
          93 + ((i - nextWordInFirstWordNum) % numPerRow) * 107 - entireX;
        const basicsY =
          147 +
          Math.floor((i - nextWordInFirstWordNum) / numPerRow) * 107 +
          entireY;
        wordPosition.push({ x: basicsX, y: basicsY, r: 20 });
        wordOrder.push("");

        drawArc(basicsX, basicsY, 20, "#fee2e2");
      }
    });

    wordOrder.forEach((word, i) => {
      const currentPosition = wordPosition[i];
      const nextWords = nextWord.find((item) => item.word === word);
      if (!nextWords || nextWords.nextWordNumber === 0) return;
      const wordOfNextWords: wordProbability[] = nextWords.nextWord;

      wordOfNextWords.forEach((nextWordItem) => {
        let nextWordPos = wordPosition[wordOrder.indexOf(nextWordItem.word)];
        if (!nextWordPos) {
          console.log(nextWordItem.word, word);
          nextWordPos = wordPosition[wordPosition.length - 1];
        }
        const direction = Math.atan2(
          nextWordPos.y - currentPosition.y,
          nextWordPos.x - currentPosition.x
        );
        const startX =
          currentPosition.x + Math.cos(direction) * currentPosition.r;
        const startY =
          currentPosition.y + Math.sin(direction) * currentPosition.r;
        const endX = nextWordPos.x - Math.cos(direction) * nextWordPos.r;
        const endY = nextWordPos.y - Math.sin(direction) * nextWordPos.r;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(
          endX - 5 * Math.cos(direction + Math.PI / 6),
          endY - 5 * Math.sin(direction + Math.PI / 6)
        );
        ctx.lineTo(
          endX - 5 * Math.cos(direction - Math.PI / 6),
          endY - 5 * Math.sin(direction - Math.PI / 6)
        );
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = Math.ceil(nextWordItem.number);
        ctx.stroke();
        ctx.closePath();
      });
    });
  }, [firstWord, nextWord, chatOrView, entireX, entireY]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const divideText = (text: string) => {
    const segmenter = new Intl.Segmenter("ja-JP", { granularity: "word" });
    const segments = Array.from(segmenter.segment(text)).map(
      (item) => item.segment
    );

    if (segments.length === 0) {
      makeSentence();
      return;
    } else if (isNotLearning) {
      addToHistory(text, true);
      setInputText("");
      makeSentence();
      return;
    }

    const newFirstWord: wordProbability[] = [...firstWord];
    const firstWordOfWord = newFirstWord.map((item) => item.word);
    const firstExisting = firstWordOfWord.indexOf(segments[0]);
    if (firstExisting == -1) {
      newFirstWord.push({ word: segments[0], number: 1 });
    } else {
      newFirstWord[firstExisting].number += 1;
    }
    setFirstWord(newFirstWord);
    setFirstWordNumber(firstWordNumber + 1);

    const newNextWord: NextWord[] = [...nextWord];
    for (let i = 0; i < segments.length; i++) {
      const newNextWordOfWord = newNextWord.map((item) => item.word);
      const existing = newNextWordOfWord.indexOf(segments[i]);

      if (existing == -1) {
        let nextWordEntry: string = "";
        if (i < segments.length - 1) {
          nextWordEntry = segments[i + 1];
        }
        newNextWord.push({
          word: segments[i],
          nextWordNumber: 1,
          nextWord: [{ word: nextWordEntry, number: 1 }],
        });
      } else {
        let nextWordEntry: string = "";
        if (i < segments.length - 1) {
          nextWordEntry = segments[i + 1];
        }
        const newNextWordEntry: NextWord = newNextWord[existing];
        const nextWords = newNextWordEntry.nextWord.map((item) => item.word);
        const nextWordExisting = nextWords.indexOf(nextWordEntry);
        if (nextWordExisting == -1) {
          newNextWordEntry.nextWord.push({
            word: nextWordEntry,
            number: 1,
          });
        } else {
          newNextWordEntry.nextWord[nextWordExisting].number += 1;
        }
        newNextWordEntry.nextWordNumber += 1;
      }
    }
    setNextWord(newNextWord);
    addToHistory(text, true);
    console.log(JSON.stringify(newNextWord, null, 2));
    setInputText("");
  };

  const makeSentence = useCallback(() => {
    if (firstWordNumber === 0 || isNotReply || chatOrView == "view") return;

    let firstWordIndex = Math.floor(Math.random() * firstWordNumber);
    let currentWord = "";
    let sentense = "";
    for (let i = 0; i < firstWord.length; i++) {
      firstWordIndex -= firstWord[i].number;
      if (firstWordIndex < 0) {
        sentense = firstWord[i].word;
        currentWord = firstWord[i].word;
        break;
      }
    }

    while (true) {
      const nextWords = nextWord.find((item) => item.word === currentWord);
      if (!nextWords || nextWords.nextWordNumber === 0) break;

      let nextWordIndex = Math.floor(Math.random() * nextWords.nextWordNumber);
      for (let j = 0; j < nextWords.nextWord.length; j++) {
        nextWordIndex -= nextWords.nextWord[j].number;
        if (nextWordIndex < 0) {
          sentense += nextWords.nextWord[j].word;
          currentWord = nextWords.nextWord[j].word;
          break;
        }
      }
      if (currentWord === "") break;
    }

    // setSentense(sentense);
    addToHistory(sentense, false);
    console.log(sentense);
  }, [firstWord, firstWordNumber, nextWord, isNotReply, chatOrView]);

  const addToHistory = (text: string, user: boolean) => {
    setHistory((prevHistory) => [...prevHistory, { text: text, user: user }]);
  };

  const clearLearning = () => {
    setFirstWord([]);
    setFirstWordNumber(0);
    setNextWord([]);
    setHistory([]);
    setInputText("");
  };

  const saveLearningData = () => {
    const learningData = JSON.stringify({
      firstWord: firstWord,
      firstWordNumber: firstWordNumber,
      nextWord: nextWord,
    });

    const blob = new Blob([learningData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "learningData.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  const loadLearningData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = JSON.parse(event.target?.result as string);
        setFirstWord(data.firstWord);
        setFirstWordNumber(data.firstWordNumber);
        setNextWord(data.nextWord);
        setEntireX(0);
        setEntireY(0);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  useEffect(() => {
    makeSentence();
  }, [nextWord, makeSentence]);

  return (
    <div className="mx-4 mt-10 flex max-w-2xl flex-col items-center md:mx-auto">
      <h1 className="mb-4 text-2xl font-bold">chatbot</h1>
      <div className="flex w-full items-center justify-between text-center">
        <button
          className={`w-full cursor-pointer border-b-2 py-2 text-xl font-bold ${chatOrView == "chat" ? "border-r-2 border-slate-500 text-slate-500" : "border-slate-300 text-slate-300"}`}
          onClick={() => setChatOrView("chat")}
        >
          チャットボット
        </button>
        <button
          className={`w-full cursor-pointer border-b-2 py-2 text-xl font-bold ${chatOrView == "view" ? "border-l-2 border-slate-500 text-slate-500" : "border-slate-300 text-slate-300"}`}
          onClick={() => setChatOrView("view")}
        >
          可視化
        </button>
      </div>
      <div className="w-full rounded-b-md border-x border-b border-gray-300 p-4">
        {chatOrView == "chat" ? (
          <div className="h-fit">
            <div
              ref={scrollRef}
              className="h-72 w-full overflow-y-auto overflow-x-hidden"
            >
              {history.map((item, i) => (
                <div
                  key={i}
                  className={`m-1 flex w-full ${item.user ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`w-fit max-w-lg rounded-lg px-2 py-1 ${item.user ? "bg-green-100" : "bg-slate-200"}`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
            </div>

            <form className="mt-2 flex w-full space-x-1">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 p-2"
                placeholder="文を入力してください"
                value={inputText}
                onChange={handleInputChange}
              />
              <button
                className="my-1 min-w-16 rounded-md bg-indigo-500 px-4 py-1 text-white hover:bg-indigo-600 active:bg-indigo-700"
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  divideText(inputText);
                }}
              >
                送信
              </button>
            </form>
          </div>
        ) : (
          <div className="relative">
            <canvas ref={canvasRef} width={638} height={288} />
            <div className="absolute bottom-0 left-0 flex items-end space-x-4">
              <div className="flex flex-col items-center">
                <div className="flex h-24 w-6 items-center justify-center">
                  <input
                    type="range"
                    id="sliderY"
                    min={
                      Math.floor(
                        nextWord.length / Math.max(firstWord.length - 1, 5)
                      ) *
                        -107 +
                      60
                    }
                    max={0}
                    value={entireY}
                    onChange={(e) => setEntireY(Number(e.target.value))}
                    className="h-6 w-24 -rotate-90"
                  />
                </div>
                <label htmlFor="sliderY" className="mb-4 mt-1">
                  Y
                </label>
              </div>
              <div className="flex flex-row">
                <label htmlFor="sliderX" className="mr-2">
                  X
                </label>
                <input
                  type="range"
                  id="sliderX"
                  min={0}
                  max={firstWord.length * 107 - 638}
                  value={entireX}
                  onChange={(e) => setEntireX(Number(e.target.value))}
                />
              </div>
            </div>

            {/* <div className="flex h-11 space-x-2 overflow-x-auto">
              {firstWord.map((item) => (
                <button
                  key={item.word}
                  className="flex w-fit cursor-pointer place-items-center space-x-2 whitespace-nowrap rounded-full border-2 bg-sky-100 p-2"
                >
                  {item.word}
                </button>
              ))}
            </div> */}
          </div>
        )}
      </div>
      <div className="mt-2 flex w-full flex-col items-start space-y-2">
        <h3 className="text-lg font-bold">設定</h3>
        <div className="flex space-x-4">
          <label htmlFor="disable-learning" className="w-fit cursor-pointer">
            <input
              type="checkbox"
              className="mr-1"
              id="disable-learning"
              checked={isNotLearning}
              onChange={(e) => {
                setIsNotLearning(e.target.checked);
              }}
            />
            学習を無効にする
          </label>
          <label htmlFor="disable-reply" className="w-fit cursor-pointer">
            <input
              type="checkbox"
              className="mr-1"
              id="disable-reply"
              checked={isNotReply}
              onChange={(e) => {
                setIsNotReply(e.target.checked);
              }}
            />
            返信を無効にする
          </label>
        </div>

        <div className="space-x-2">
          <button
            className="rounded-md bg-indigo-500 px-4 py-1 text-white hover:bg-indigo-600 active:bg-indigo-700"
            onClick={loadLearningData}
          >
            学習データを読み込む
          </button>
          <button
            className="rounded-md bg-green-500 px-4 py-1 text-white hover:bg-green-600 active:bg-green-700"
            onClick={saveLearningData}
          >
            学習データを保存する
          </button>
          <button
            className="rounded-md bg-red-500 px-4 py-1 text-white hover:bg-red-600 active:bg-red-700"
            onClick={clearLearning}
          >
            履歴と学習データをクリア
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
