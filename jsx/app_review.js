var Review = React.createClass({
    getInitialState() {
        return {
            progressState: "frontSide"
        };
    },
    componentDidMount(){
        if("flipButton" in this.refs)
            this.refs.flipButton.getDOMNode().focus();
    },
    componentDidUpdate : function(){
        if(this.state.progressState === "frontSide" && "flipButton" in this.refs)
            this.refs.flipButton.getDOMNode().focus();
    },
    flip(){
        this.setState({progressState: "backSide"});
    },
    applyInterval(infoIndex, reviewKey, newInterval){
        this.props.applyInterval(infoIndex, reviewKey, newInterval);
        this.setState({progressState: "frontSide"});
    },
    filterInfo(filterStr, info){
        if(filterStr===""){
            return true
        }

        var filtersOr = filterStr.split(" or ");
        for (var i = 0; i < filtersOr.length; ++i) {
            var filterElements = filtersOr[i].split(" and ");
            for (var j = 0; j < filterElements.length; ++j) {
                var innerTruth = true;
                var matches;
                if((matches = /tag: ?(\w+)/.exec(filterElements[j])) != null) {
                    if(!(_.contains(info.tags, matches[1])) ){
                        innerTruth = false;
                    }
                }
                else{
                    console.log("Error, unknown filter: " + filterElements[j]);
                    return false;
                }
            }
            if(innerTruth)
                return true;
        }
        return false;
    },
    render() {
        // filter due cards and chose the next
        var urgency;
        var dueCount = 0;
        var realInterval;
        var nextReview = {
            urgency: 1.0,
            infoIndex: 0,
            info: false,
            templateID: 0,
            realInterval: 0
        };
        for (var infoIndex = 0; infoIndex < this.props.infos.length; ++infoIndex) {
            var info = this.props.infos[infoIndex];
            for(var templateID in info.reviews){
                if( this.filterInfo(this.props.types[info.typeID].templates[templateID].condition, info)){
                    if(info.reviews[templateID].length > 0) {
                        let lastReview = info.reviews[templateID][info.reviews[templateID].length - 1];
                        realInterval = moment().diff(moment(lastReview.reviewTime));
                        urgency = realInterval / moment(lastReview.dueTime).diff(moment(lastReview.reviewTime));
                    }else {
                        urgency = 1.1;
                        realInterval = 0;
                    }

                    if(urgency >= 1.0) {
                        dueCount++;
                        if (urgency > nextReview.urgency) {
                            nextReview.urgency = urgency;
                            nextReview.info = info;
                            nextReview.infoIndex = infoIndex;
                            nextReview.templateID = templateID;
                            nextReview.realInterval = realInterval;
                        }
                    }
                }
            }
        }

        if (dueCount > 0) {
            return (
                <div className="Component">
                    <button
                        tabIndex="2"
                        onClick={this.props.gotoEdit.bind(null, nextReview.infoIndex)}>Edit Info</button>
                    <span>{"Due count: " + dueCount}</span>

                    <ReviewDisplay
                        type={this.props.types[nextReview.info.typeID]}
                        templateID={nextReview.templateID}
                        info={nextReview.info}
                        progressState={this.state.progressState}
                    />

                    {this.state.progressState === "frontSide" &&
                        <div style={{textAlign: "center"}}>
                            <button
                                tabIndex="1"
                                ref="flipButton"
                                className="buttonGood"
                                onClick={this.flip}>Show backside
                            </button>
                        </div>
                    }

                    <Intervaller
                        show={this.state.progressState === "backSide"}
                        reviewInterval={nextReview.realInterval}
                        applyInterval={this.applyInterval.bind(this, nextReview.infoIndex, nextReview.templateID)}
                        timeIntervalChoices={this.props.timeIntervalChoices}
                    />
                </div>
            );
        }
        else {
            return (
                <div
                    className="Component"
                    style={{textAlign: "center"}}>No due reviews
                </div>
            )
        }
    }
});
