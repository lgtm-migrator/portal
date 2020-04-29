import React from "react";
import {Link} from "react-router-dom";
import BootstrapTable from "react-bootstrap-table-next";
import "./NodesMain.scss";
import {Button, Col, FormControl, InputGroup, Row} from "react-bootstrap";
import PocketElementCard from "../../../core/components/PocketElementCard/PocketElementCard";
import ApplicationService from "../../../core/services/PocketApplicationService";
import UserService from "../../../core/services/PocketUserService";
import AppDropdown from "../../../core/components/AppDropdown/AppDropdown";
import {NODES_LIMIT, BOND_STATUS_STR} from "../../../_constants";
import {_getDashboardPath, DASHBOARD_PATHS} from "../../../_routes";
import Loader from "../../../core/components/Loader";
import Main from "../../../core/components/Main/Main";
import InfoCards from "../../../core/components/InfoCards";
import {mapStatusToApp, getBondStatus} from "../../../_helpers";
import NodeService from "../../../core/services/PocketNodeService";
import overlayFactory from "react-bootstrap-table2-overlay";
import LoadingOverlay from "react-loading-overlay";

class NodesMain extends Main {
  constructor(props, context) {
    super(props, context);

    this.handleUserItemsFilter = this.handleUserItemsFilter.bind(this);
    this.handleAllItemsFilter = this.handleAllItemsFilter.bind(this);

    this.state = {
      ...this.state,
    };
  }

  async handleUserItemsFilter(option) {
    this.setState({userItemsTableLoading: true});

    const userEmail = UserService.getUserInfo().email;

    const userItems = await NodeService.getAllUserNodes(
      userEmail, NODES_LIMIT, 0, BOND_STATUS_STR[option]
    );

    this.setState({
      userItems,
      filteredItems: userItems,
      userItemsTableLoading: false,
    });
  }

  async handleAllItemsFilter(option) {
    this.setState({allItemsTableLoading: true});

    const registeredItems = await NodeService.getAllNodes(
      NODES_LIMIT, 0, BOND_STATUS_STR[option]
    );

    this.setState({allItemsTableLoading: false, registeredItems});
  }

  async componentDidMount() {
    const userEmail = UserService.getUserInfo().email;

    const userItems = await NodeService.getAllUserNodes(userEmail, NODES_LIMIT);

    const {
      totalApplications,
      averageRelays,
      averageStaked,
    } = await ApplicationService.getStakedApplicationSummary();

    const registeredItems = await NodeService.getAllNodes(NODES_LIMIT);

    this.setState({
      userItems,
      filteredItems: userItems,
      total: totalApplications,
      averageRelays,
      averageStaked,
      registeredItems,
      loading: false,
    });
  }

  render() {
    const {
      filteredItems,
      total,
      averageStaked,
      averageRelays,
      registeredItems: allRegisteredItems,
      loading,
      allItemsTableLoading,
      userItemsTableLoading,
    } = this.state;

    const columns = [
      {
        dataField: "pocketNode.name",
        text: "Name",
      },
      {
        dataField: "pocketNode.publicPocketAccount.address",
        text: "Address",
      },

      {
        dataField: "networkData.status",
        text: "Status",
      },
    ];

    const registeredItems = allRegisteredItems.map(mapStatusToApp);

    const cards = [
      {title: total, subtitle: "Total of node"},
      {title: averageStaked, subtitle: "Average staked"},
      {title: averageRelays, subtitle: "Average relays per node"},
      {title: 23867, subtitle: "Max Staked"},
      {title: 10345, subtitle: "Min staked"},
    ];

    if (loading) {
      return <Loader />;
    }

    return (
      <div>
        <Row>
          <Col sm="8" md="8" lg="8">
            <h2 className="ml-1">General Nodes Information</h2>
          </Col>
          <Col
            sm="4"
            md="4"
            lg="4"
            className="d-flex justify-content-end general-info"
          >
            <Link to={_getDashboardPath(DASHBOARD_PATHS.createNodeForm)}>
              <Button
                variant="dark"
                size={"md"}
                className="ml-4 pl-4 pr-4 mr-3"
              >
                Create new node
              </Button>
              </Link>
            <Link to={_getDashboardPath(DASHBOARD_PATHS.importNode)}>
            <Button variant="secondary" size={"md"} className="pl-4 pr-4">
              Import node
            </Button>
            </Link>
          </Col>
        </Row>
        <Row className="stats mb-4">
          <InfoCards cards={cards} />
        </Row>
        <Row className="mb-4">
          <Col sm="8" md="8" lg="8">
            <h2 className="mb-3">My nodes</h2>
            <Row>
              <Col sm="8" md="8" lg="8">
                <InputGroup className="mb-3">
                  <FormControl
                    placeholder="Search node"
                    name="searchQuery"
                    onChange={this.handleChange}
                    onKeyPress={({key}) => {
                      if (key === "Enter") {
                        this.handleSearch("pocketNode.name");
                      }
                    }}
                  />
                  <InputGroup.Append>
                    <Button
                      type="submit"
                      onClick={() => this.handleSearch("pocketNode.name")}
                      variant="dark"
                    >
                      Search
                    </Button>
                  </InputGroup.Append>
                </InputGroup>
              </Col>
              <Col sm="4" md="4" lg="4" className="order-by">
                <p style={{fontWeight: "bold", fontSize: "1.2em"}}>
                  Filter by:
                </p>
                <AppDropdown
                  onSelect={(status) =>
                    this.handleUserItemsFilter(status.dataField)
                  }
                  options={[
                    {text: "Bonded", dataField: "bonded"},
                    {text: "Unbonding", dataField: "unbonding"},
                    {text: "Unbonded", dataField: "unbonded"},
                  ]}
                />
              </Col>
            </Row>
            <div className="main-list">
              <LoadingOverlay active={userItemsTableLoading} spinner>
                {filteredItems.map((app, idx) => {
                  const {name, icon} = app.pocketNode;
                  const {stakedTokens, status} = app.networkData;

                  // TODO: Add network information
                  return (
                    <PocketElementCard
                      key={idx}
                      title={name}
                      subtitle={`Staked POKT: ${stakedTokens} POKT`}
                      status={getBondStatus(status)}
                      iconURL={icon}
                    />
                  );
                })}
              </LoadingOverlay>
            </div>
          </Col>
          <Col sm="4" md="4" lg="4">
            <h2>Registered Nodes</h2>
            <div className="order-by">
              <p style={{fontWeight: "bold", fontSize: "1.2em"}}>Filter by:</p>
              <AppDropdown
                onSelect={(status) =>
                  this.handleAllItemsFilter(status.dataField)
                }
                options={[
                  {text: "Bonded", dataField: "bonded"},
                  {text: "Unbonding", dataField: "unbonding"},
                  {text: "Unbonded", dataField: "unbonded"},
                ]}
              />
            </div>
            <BootstrapTable
              classes="app-table table-striped"
              keyField="pocketNode.publicPocketAccount.address"
              data={registeredItems}
              columns={columns}
              bordered={false}
              loading={allItemsTableLoading}
              noDataIndication={"No nodes found"}
              overlay={overlayFactory({
                spinner: true,
                styles: {
                  overlay: (base) => ({
                    ...base,
                    background: "rgba(0, 0, 0, 0.2)",
                  }),
                },
              })}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

export default NodesMain;
