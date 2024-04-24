import { useState } from "react";

export default function Formatter() {
  function formatRepoName(repoName) {
    return repoName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  const [projectName, setProjectName] = useState("");
  const [formattedName, setFormattedName] = useState("");
  const handleChange = (event) => {
    setProjectName(event.target.value);
    setFormattedName(formatRepoName(event.target.value));
  };

  return (
    <div className="p-2 border-2 border-gray-300">
      <div className="flex items-center space-x-2">
        <span className="">项目名称：</span>
        <input
          className="border-2 border-gray-100 px-1 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
          value={projectName}
          placeholder="请输入你的项目名称"
          onChange={handleChange}
        />
      </div>
      <p className="mt-2">格式化结果：{formattedName}</p>
    </div>
  );
}
