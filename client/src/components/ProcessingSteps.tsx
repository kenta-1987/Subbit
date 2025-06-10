interface ProcessingStepsProps {
  currentStep: number;
}

export default function ProcessingSteps({ currentStep }: ProcessingStepsProps) {
  const steps = [
    {
      title: "ファイルのアップロード",
      description: currentStep > 1 ? "完了" : "処理中..."
    },
    {
      title: "音声解析",
      description: currentStep === 2 ? "処理中..." : currentStep > 2 ? "完了" : "待機中"
    },
    {
      title: "テロップ生成",
      description: currentStep === 3 ? "処理中..." : currentStep > 3 ? "完了" : "待機中"
    }
  ];

  return (
    <ul className="space-y-4">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        let iconClass = "";
        let stepClass = "";
        
        if (stepNumber < currentStep) {
          // Completed step
          iconClass = "bg-success text-white";
          stepClass = "";
        } else if (stepNumber === currentStep) {
          // Current step
          iconClass = "bg-primary text-white";
          stepClass = "";
        } else {
          // Future step
          iconClass = "bg-neutral-300 text-white";
          stepClass = "opacity-50";
        }
        
        return (
          <li key={index} className={`flex items-center ${stepClass}`}>
            <div className={`rounded-full ${iconClass} w-6 h-6 flex items-center justify-center mr-3`}>
              {stepNumber < currentStep ? (
                <i className="fas fa-check text-xs"></i>
              ) : stepNumber === currentStep ? (
                <i className="fas fa-spinner fa-spin text-xs"></i>
              ) : (
                <span className="text-xs">{stepNumber}</span>
              )}
            </div>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-neutral-500">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
