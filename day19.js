const video = document.querySelector('.player');
const canvas = document.querySelector('.photo');
const ctx = canvas.getContext('2d');
const strip = document.querySelector('.strip');
const snap = document.querySelector('.snap');

function switchType(num) {
    type = num;
}

// 原始畫面
// 電腦版在左側，手機板在右上
// 不一定要開，可以設定display:none
function getVideo() {
    // navigator.mediaDevices.getUserMedia() = 要求媒體權限許可
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        //只要相機畫面，不要輸入麥克風聲音
        .then(localMediaStream => {
            //這是自訂的變數
            console.log(localMediaStream); //確認物件內容
            video.srcObject = localMediaStream;
            //用srcObjec屬性存放localMediaStream當作來源
            video.play(); //執行函式，取得鏡頭的畫面
        })
        .catch(err => {
            console.error(`OH NO!!!`, err);
            // 找不到攝影機or按封鎖
        });
}

// 繪製右側圖像，畫在ctx
// 拿原始video的畫面進行處理
function paintToCanvas() {
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    // ctx.drawImage(video, 0, 0, width, height);
    //這行是測試顏色用的
    // 配合console.log(pixels.data[0], pixels.data[1], pixels.data[2], pixels.data[3]);

    let pixels = ctx.getImageData(0, 0, width, height);
    console.log(`Area:${width * height},Pixels:${pixels.data.length}`);
    // 例如h300*w200= area 60000，有六萬個點要處理
    // 每個點又切換成rgba四色，範圍0-255
    // 注意console出現的兩個數字正好差4倍，因為一個點被拆解成rgba(紅,黃,藍,透明度)，4個數值

    // console.log(pixels.data[0], pixels.data[1], pixels.data[2], pixels.data[3]);
    // 最左上角應該是 0,0,0,0
    //配合上方ctx.drawImage(video, 0, 0, width, height);
    // 可能會出現 93 ,173,112 ,255 ，對應rgba
    // 如果改成
    // console.log(pixels.data[0 + 4], pixels.data[1 + 4], pixels.data[2 + 4], pixels.data[3 + 4]);
    // 可能會出現 91 ,175, 115,255 ，注意255是極限，再往上加也是這個數字

    // 當畫面出現時觸發
    return setInterval(() => {
        ctx.drawImage(video, 0, 0, width, height);
        //ctx.drawImage(繪製位置, 繪製的起點, 繪製的高寬);

        // take the pixels out
        let pixels = ctx.getImageData(0, 0, width, height);
        // mess with them

        switch (type) {
            case 1:
                pixels = redEffect(pixels);
                // 紅色效果
                break;
            case 2:
                pixels = rgbSplit(pixels);
                // 色板分離
                break;
            case 3:
                pixels = greenScreen(pixels);
                // 去背
                break;
            default:
                break;
        }

        // pixels = redEffect(pixels);
        // pixels = rgbSplit(pixels);
        // ctx.globalAlpha = 0.8;
        // pixels = greenScreen(pixels);
        // put them back
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(pixels, 0, 0);
    }, 16);
}

// 顯示照片
function takePhoto() {
    // played the sound
    snap.currentTime = 0;
    snap.play();
    // 快門聲播放

    // take the data out of the canvas
    const data = canvas.toDataURL('image/jpeg'); //截圖功能，轉成Base64字串
    const link = document.createElement('a');
    link.href = data;
    link.setAttribute('download', 'handsome'); //下載功能
    link.innerHTML = `<img src="${data}" alt="Handsome Man" />`;
    strip.insertBefore(link, strip.firstChild);
    // 新照片放最前面
    // strip.insertBefore(link, null);
    // 照片放後面
}

// 紅色效果
function redEffect(pixels) {
    for (let i = 0; i < pixels.data.length; i += 4) {
        //i += 4 因為rgba一組4個，一次跳4個才能到下一組
        // 以下可以註解掉其中兩個，會出現單色效果
        pixels.data[i + 0] = pixels.data[i + 0] + 200; // RED
        pixels.data[i + 1] = pixels.data[i + 1] + 0; //- 50; // GREEN
        pixels.data[i + 2] = pixels.data[i + 2] * 0.5; // Blue
        // +3是透明度，設定上已是最高，往上加沒效果，只能向下減
    }
    return pixels;
}

// 色板分離
function rgbSplit(pixels) {
    for (let i = 0; i < pixels.data.length; i += 4) {
        // 使用位移
        // pixels.data[i - 150] = pixels.data[i + 0]; // RED
        // pixels.data[i + 500] = pixels.data[i + 1]; // GREEN
        // pixels.data[i - 550] = pixels.data[i + 2]; // Blue
        // 測試 - 位移的寬度夠大就會往上移動
        pixels.data[i - canvas.width * 4 * 50] = pixels.data[i + 0]; // RED
        pixels.data[i + 1 - canvas.width * 4 * 30] = pixels.data[i + 1]; // GREEN
        pixels.data[i + 2 - canvas.width * 4 * 10] = pixels.data[i + 2]; // Blue
    }
    return pixels;
}

// 去背
function greenScreen(pixels) {
    const levels = {};
    // 對應拉桿
    document.querySelectorAll('.rgb input').forEach(input => {
        levels[input.name] = input.value;
    });

    for (i = 0; i < pixels.data.length; i = i + 4) {
        red = pixels.data[i + 0];
        green = pixels.data[i + 1];
        blue = pixels.data[i + 2];
        alpha = pixels.data[i + 3];

        if (
            //確認顏色是否在此範圍內
            red >= levels.rmin &&
            green >= levels.gmin &&
            blue >= levels.bmin &&
            red <= levels.rmax &&
            green <= levels.gmax &&
            blue <= levels.bmax
        ) {
            // take it out!
            pixels.data[i + 3] = 0;
            //如果顏色在範圍內，則透明度0，也就是讓顏色消失
        }
    }

    return pixels;
}

getVideo();

video.addEventListener('canplay', paintToCanvas);
