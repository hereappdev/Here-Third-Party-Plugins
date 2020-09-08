here.on("load", () => {
    here.miniWindow.data = {
        title: "基金助手",
        detail: "时刻关注你的基金！",
    };
    here.miniWindow.reload();

    here.popover = new here.WebViewPopover();
    here.popover.data = {
        url: "./src/index.html",
        width: 600,
        height: 600,
        backgroundColor: "#FFFFFF",
        foregroundColor: rgba(255, 255, 255, 255),
        hideStatusBar: true,
    };
    here.popover.reload();
});
