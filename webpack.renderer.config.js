const rules = require("./webpack.rules");
const plugins = require("./webpack.plugins");

rules.push({
    test: /\.css$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});

rules.push({
    test: /\.svg$/,
    use: ["@svgr/webpack"],
});

module.exports = {
    module: {
        rules,
    },
    target: "electron-renderer",
    plugins: plugins,
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
    },
};
